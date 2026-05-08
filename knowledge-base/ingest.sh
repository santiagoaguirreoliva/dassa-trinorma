#!/usr/bin/env bash
# =============================================================================
# DASSA SGI — Knowledge Base Ingest
# Procesa PDFs/DOCX/MD/TXT del directorio raw/ y los inserta en agent_knowledge
# =============================================================================
# Uso:
#   1. Descargá todas las carpetas TRINORMA del Drive a tu PC
#   2. Subí los archivos a /home/dassa/dassa-sgi/knowledge-base/raw/ (con scp)
#   3. Corré: ./ingest.sh
#   4. El script extrae texto y los carga en la tabla agent_knowledge
# =============================================================================

set -e
KB_DIR="${KB_DIR:-/home/dassa/dassa-sgi/knowledge-base}"
RAW_DIR="$KB_DIR/raw"
PROCESSED_DIR="$KB_DIR/processed"
DEFAULT_CATEGORY="${DEFAULT_CATEGORY:-trinorma_2026}"

mkdir -p "$RAW_DIR" "$PROCESSED_DIR"

if [ -z "$(ls -A $RAW_DIR 2>/dev/null)" ]; then
  echo "═══════════════════════════════════════════════════════════════════"
  echo "  El directorio $RAW_DIR está vacío"
  echo "═══════════════════════════════════════════════════════════════════"
  echo ""
  echo "  Para cargar los documentos del Drive TRINORMA:"
  echo ""
  echo "  Opción A — desde tu PC con scp:"
  echo "    scp -r 'C:\\TRINORMA 2026\\*' dassa@181.174.193.98:$RAW_DIR/"
  echo ""
  echo "  Opción B — usando rclone con Google Drive:"
  echo "    rclone config  # configurar Google Drive"
  echo "    rclone copy 'gdrive:TRINORMA 2026' $RAW_DIR/"
  echo ""
  echo "  Opción C — descargar como ZIP desde Drive:"
  echo "    1. En Drive: click derecho en la carpeta TRINORMA 2026"
  echo "    2. Descargar (genera un .zip)"
  echo "    3. Subirlo: scp TRINORMA-2026.zip dassa@app01:$RAW_DIR/"
  echo "    4. cd $RAW_DIR && unzip TRINORMA-2026.zip"
  echo ""
  exit 0
fi

# Instalar deps si faltan
echo "[1/3] Verificando deps..."
which pdftotext >/dev/null 2>&1 || sudo apt-get install -y poppler-utils
which docx2txt >/dev/null 2>&1 || pip install --user docx2txt 2>/dev/null || true
cd /home/dassa/dassa-sgi
node -e "require('mammoth')" 2>/dev/null || npm install --save mammoth 2>&1 | tail -2

# Función Node para insertar en DB
cat > /tmp/kb-insert.js << 'NODEEOF'
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ingest(filePath, content, category) {
  const title = path.basename(filePath).replace(/\.(pdf|docx?|md|txt)$/i, '');
  const summary = content.split(/\n\n/)[0].substring(0, 400);
  const sourceUrl = `file://${filePath}`;

  // Cortar en chunks de ~2000 chars para que el RAG funcione mejor
  const CHUNK_SIZE = 2000;
  const chunks = [];
  for (let i = 0; i < content.length; i += CHUNK_SIZE) {
    chunks.push(content.slice(i, i + CHUNK_SIZE));
  }

  let inserted = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunkTitle = chunks.length === 1 ? title : `${title} — parte ${i+1}/${chunks.length}`;
    await pool.query(
      `INSERT INTO agent_knowledge (title, category, content, summary, source_url, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT DO NOTHING`,
      [chunkTitle, category, chunks[i], summary, sourceUrl]
    );
    inserted++;
  }
  console.log(`  ✓ ${title} (${inserted} chunks, ${content.length} chars)`);
  return inserted;
}

(async () => {
  const file = process.argv[2];
  const content = process.argv[3];
  const category = process.argv[4] || 'trinorma_2026';
  await ingest(file, content, category);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
NODEEOF

echo ""
echo "[2/3] Procesando archivos en $RAW_DIR..."
COUNT=0
FAILED=0

# Iterar archivos
find "$RAW_DIR" -type f \( -name "*.pdf" -o -name "*.docx" -o -name "*.doc" -o -name "*.md" -o -name "*.txt" \) | while read -r file; do
  echo "  → $file"

  # Categoría = subdirectorio
  rel=$(realpath --relative-to="$RAW_DIR" "$file")
  subdir=$(dirname "$rel")
  category="${DEFAULT_CATEGORY}"
  [ "$subdir" != "." ] && category="trinorma_$(echo "$subdir" | tr '/' '_' | tr ' ' '_' | tr '[:upper:]' '[:lower:]')"

  # Extraer texto según extensión
  ext="${file##*.}"
  ext_lower=$(echo "$ext" | tr '[:upper:]' '[:lower:]')

  case "$ext_lower" in
    pdf)
      content=$(pdftotext -layout "$file" - 2>/dev/null || true)
      ;;
    docx)
      content=$(node -e "const m = require('mammoth'); m.extractRawText({path: '$file'}).then(r => console.log(r.value)).catch(e => console.error(e))" 2>/dev/null)
      ;;
    md|txt)
      content=$(cat "$file")
      ;;
    *)
      echo "    ✗ Formato no soportado"
      continue
      ;;
  esac

  if [ -z "$content" ] || [ ${#content} -lt 100 ]; then
    echo "    ✗ Sin contenido extraíble (${#content} chars)"
    FAILED=$((FAILED+1))
    continue
  fi

  # Insertar en DB via node
  cd /home/dassa/dassa-sgi
  node /tmp/kb-insert.js "$file" "$content" "$category" || { echo "    ✗ Error insertando"; FAILED=$((FAILED+1)); continue; }

  # Mover a processed
  rel_path=$(realpath --relative-to="$RAW_DIR" "$file")
  dest="$PROCESSED_DIR/$rel_path"
  mkdir -p "$(dirname "$dest")"
  mv "$file" "$dest"

  COUNT=$((COUNT+1))
done

echo ""
echo "[3/3] Resumen final:"
TOTAL_DOCS=$(sudo -u postgres psql -d dassa_sgi -t -c "SELECT COUNT(*) FROM agent_knowledge WHERE is_active = TRUE")
TOTAL_CATS=$(sudo -u postgres psql -d dassa_sgi -t -c "SELECT COUNT(DISTINCT category) FROM agent_knowledge WHERE is_active = TRUE")
echo "  Documentos en knowledge base:$TOTAL_DOCS"
echo "  Categorías:$TOTAL_CATS"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  INGESTA COMPLETA"
echo "  Archivos procesados movidos a: $PROCESSED_DIR"
echo "  Para consultar el agente con knowledge base:"
echo "    POST /api/auditor/chat con use_rag=true"
echo "═══════════════════════════════════════════════════════════════════"
