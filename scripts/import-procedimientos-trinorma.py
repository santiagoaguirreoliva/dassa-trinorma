#!/usr/bin/env python3
"""
Importa los procedimientos reales de Trinorma (descargados del Drive a
uploads/procedimientos/) a la tabla documents, integrándolos SIN duplicar con
el seed placeholder previo.

- 13 placeholder se FUSIONAN con su procedimiento real (UPDATE in-place).
- 8 procedimientos reales NUEVOS se INSERTAN.
- 6 placeholder sin documento fuente quedan marcados needs_source=true.

Idempotente: re-ejecutable. Genera /tmp/import_procs.sql y lo aplica con psql.
Reproducible desde el repo: re-extrae el texto de los .docx en uploads/.
"""
import json, os, re, zipfile, glob, subprocess
from xml.etree import ElementTree as ET

APP   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPL   = os.path.join(APP, "uploads", "procedimientos")
TENANT = "00000000-0000-0000-0000-000000000001"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

# code -> (título limpio, norma)
META = {
 "P-TRI-01": ("Análisis de Contexto", "TRINORMA"),
 "P-TRI-02": ("Riesgos y Oportunidades", "TRINORMA"),
 "P-TRI-03": ("Revisión por la Dirección", "TRINORMA"),
 "P-TRI-04": ("Comunicaciones", "TRINORMA"),
 "P-TRI-05": ("Control de Información Documentada", "TRINORMA"),
 "P-TRI-06": ("Evaluación y Cumplimiento de Requisitos Legales", "TRINORMA"),
 "P-TRI-07": ("Gestión de No Conformidades y Acciones Correctivas", "TRINORMA"),
 "P-TRI-08": ("Gestión de Cambios", "TRINORMA"),
 "P-TRI-09": ("Gestión Comercial", "ISO 9001"),
 "P-TRI-10": ("Satisfacción de Clientes", "ISO 9001"),
 "P-TRI-11": ("Compras, Contratistas y Proveedores", "ISO 9001"),
 "P-TRI-12": ("Mantenimiento", "TRINORMA"),
 "P-TRI-13": ("Operación Exportación", "ISO 9001"),
 "P-TRI-14": ("Operación Importación", "ISO 9001"),
 "P-TRI-17": ("Capital Humano", "ISO 9001"),
 "P-TRI-18": ("Participación y Consulta", "ISO 45001"),
 "P-TRI-21": ("Identificación de Peligros y Evaluación de Riesgos", "ISO 45001"),
 "P-TRI-22": ("Investigación de Incidentes y Accidentes", "ISO 45001"),
 "P-TRI-23": ("Aspectos e Impactos Ambientales", "ISO 14001"),
 "P-TRI-24": ("Auditorías Internas", "TRINORMA"),
 "P-TRI-25": ("Gestión de Residuos", "ISO 14001"),
}
# real code -> uuid del placeholder a fusionar
MERGE = {
 "P-TRI-23": "d9aa350e-abc4-4b2b-87b3-733ef59f6fd7",  # P-AMB-001
 "P-TRI-25": "2eeaf9aa-1d4d-487b-b7d0-b2478ed2d6a7",  # P-AMB-002
 "P-TRI-10": "d7068083-c97b-4f3e-a897-afb1aa978a24",  # P-CAL-001
 "P-TRI-11": "9979d4c3-0d00-4195-bbee-924204beccd3",  # P-CAL-002
 "P-TRI-05": "267c0245-1d99-4f0e-91c3-264f127c51c0",  # P-SGI-001
 "P-TRI-24": "318013e2-13ba-417d-a8e5-847b017a2550",  # P-SGI-002
 "P-TRI-07": "ee7681e3-9d43-4bcd-9b2a-1a34855b426d",  # P-SGI-003
 "P-TRI-03": "1b02b0d9-bb10-4dd9-85a6-1a37bf1d352c",  # P-SGI-004
 "P-TRI-02": "cf908acc-47c9-4061-9151-0813a14591a7",  # P-SGI-005
 "P-TRI-17": "72975617-6a40-44b3-b18c-1835ad24a21a",  # P-SGI-006
 "P-TRI-04": "715b3fce-6e7d-41ff-8607-13d2032da7d4",  # P-SGI-007
 "P-TRI-21": "0bb88e4e-94ae-4707-acee-bd0becb418f4",  # P-SST-001
 "P-TRI-22": "071c6e8b-bc43-42ee-9ff1-a1c3f8671ee4",  # P-SST-002
}
# placeholder a mantener + marcar sin fuente
KEEP_FLAG = ["P-AMB-003","P-CAL-003","P-OP-001","P-OP-002","P-SST-003","P-SST-004"]

def docx_text(path):
    root = ET.fromstring(zipfile.ZipFile(path).read("word/document.xml"))
    out = []
    for p in root.iter(f"{W}p"):
        line = "".join((t.text or "") for t in p.iter(f"{W}t")).strip()
        ppr = p.find(f"{W}pPr"); style = ""
        if ppr is not None:
            ps = ppr.find(f"{W}pStyle")
            if ps is not None: style = (ps.get(f"{W}val","") or "").lower()
        if line:
            out.append("\n## " + line if style.startswith(("heading","titulo","ttulo")) else line)
    return "\n".join(out)

def q(s):  # dollar-quote seguro
    s = (s or "").replace("$md$", "$ md $")
    return f"$md$\n{s}\n$md$"

def lit(s):  # string literal SQL
    return "'" + (s or "").replace("'", "''") + "'"

procs = json.load(open("/tmp/procs_canonicos.json"))
sql = ["BEGIN;"]
done = []
for p in procs:
    code = p["code"]; proceso = p["proceso"]; fid = p["file_id"]
    title, norma = META[code]
    src = os.path.join(UPL, f"{code} {p['title']}.docx".replace("/", "-"))
    if not os.path.exists(src):
        cands = glob.glob(os.path.join(UPL, f"{code} *.docx"))
        src = cands[0] if cands else None
    if not src:
        print("!! falta docx para", code); continue
    slug = os.path.join(UPL, f"{code}.docx")
    if os.path.abspath(src) != os.path.abspath(slug):
        os.replace(src, slug)
    text = docx_text(slug)
    file_url  = f"/uploads/procedimientos/{code}.docx"
    file_name = f"{code} {title}.docx"
    common = (f"title={lit(title)}, content_md={q(text)}, proceso={lit(proceso)}, "
              f"norma={lit(norma)}, doc_type='procedimiento', status='aprobado', "
              f"file_url={lit(file_url)}, file_name={lit(file_name)}, "
              f"drive_file_id={lit(fid)}, needs_source=false, updated_at=now()")
    if code in MERGE:
        sql.append(f"UPDATE documents SET code={lit(code)}, {common} WHERE id='{MERGE[code]}';")
    else:
        sql.append(
          "INSERT INTO documents (code, title, content_md, proceso, norma, doc_type, status, "
          "file_url, file_name, drive_file_id, needs_source, tenant_id, version) VALUES ("
          f"{lit(code)}, {lit(title)}, {q(text)}, {lit(proceso)}, {lit(norma)}, 'procedimiento', "
          f"'aprobado', {lit(file_url)}, {lit(file_name)}, {lit(fid)}, false, '{TENANT}', 1) "
          "ON CONFLICT (code) DO UPDATE SET "
          "title=EXCLUDED.title, content_md=EXCLUDED.content_md, proceso=EXCLUDED.proceso, "
          "norma=EXCLUDED.norma, status=EXCLUDED.status, file_url=EXCLUDED.file_url, "
          "file_name=EXCLUDED.file_name, drive_file_id=EXCLUDED.drive_file_id, "
          "needs_source=false, updated_at=now();")
    done.append((code, title, "FUSIÓN" if code in MERGE else "ALTA", len(text)))

# placeholder sin fuente
ph = ",".join(lit(c) for c in KEEP_FLAG)
sql.append(f"UPDATE documents SET needs_source=true, updated_at=now() WHERE code IN ({ph});")
sql.append("COMMIT;")

open("/tmp/import_procs.sql", "w").write("\n".join(sql))
print(f"{'CÓDIGO':<10}{'ACCIÓN':<9}{'CHARS':<8} TÍTULO")
for c, t, a, n in done:
    print(f"{c:<10}{a:<9}{n:<8} {t}")
print(f"\nSQL generado: {len(done)} procedimientos · flag sin-fuente: {len(KEEP_FLAG)}")
print("Aplicando con psql...")
dburl = subprocess.run(
    "grep -E '^DATABASE_URL=' "+os.path.join(APP,".env")+" | head -1 | cut -d= -f2- | tr -d '\"'\"'\"''",
    shell=True, capture_output=True, text=True).stdout.strip()
r = subprocess.run(["psql", dburl, "-v", "ON_ERROR_STOP=1", "-f", "/tmp/import_procs.sql"],
                   capture_output=True, text=True)
print(r.stdout[-1500:]); print(r.stderr[-1500:])
print("EXIT", r.returncode)
