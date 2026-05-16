// Utilidad compartida para guardar archivos subidos en base64.
// Usada por el router de findings y por el router público de NC.
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = join(__dirname, '../../uploads');

try { mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}

// Tipos de archivo permitidos en uploads (H-10 · hardening)
const ALLOWED_UPLOAD_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']);
const MIME_TO_EXT = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
  'image/webp': 'webp', 'application/pdf': 'pdf',
};

// Guarda un data-URI base64 en /uploads y devuelve la URL pública, o null si
// el formato/tipo no es válido.
export function saveBase64File(base64Data, label) {
  const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return null;
  const mime = matches[1].toLowerCase().trim();
  const ext = MIME_TO_EXT[mime];
  // H-10: solo se aceptan tipos de la whitelist (no se confía en el mime del cliente)
  if (!ext || !ALLOWED_UPLOAD_EXT.has(ext)) return null;
  // H-04: nombre con UUID aleatorio — la URL deja de ser enumerable por timestamp
  const safeLabel = String(label).replace(/[^a-z0-9-]/gi, '').slice(0, 24) || 'file';
  const fname = `${safeLabel}-${randomUUID()}.${ext}`;
  writeFileSync(join(UPLOADS_DIR, fname), Buffer.from(matches[2], 'base64'));
  return `/uploads/${fname}`;
}
