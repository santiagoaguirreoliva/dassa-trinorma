// Router PÚBLICO — solo la carga de no conformidades desde el QR.
// Se monta en /api/public. No requiere autenticación (H-06: antes se montaba
// el findingsRouter completo bajo este namespace).
import { Router } from 'express';
import { query } from '../db/db.js';
import { saveBase64File } from '../services/uploads.js';

const router = Router();

// POST /api/public/nc — alta de NC desde el formulario público del QR
router.post('/nc', async (req, res) => {
  const {
    description, area, detected_by, detected_by_email,
    affected_client, client_complaint,
    immediate_action_required, immediate_action,
    current_status, comments,
    photo_base64, report_kind
  } = req.body;

  if (!description || !area) {
    return res.status(400).json({ error: 'Descripción y sector son requeridos' });
  }

  // 'nc' = No Conformidad Trinorma (gestión formal) · 'hallazgo' = aviso/hallazgo
  // general (se revisa en comité mixto). Segregados por findings.report_kind.
  const kind = report_kind === 'hallazgo' ? 'hallazgo' : 'nc';

  try {
    let evidence_urls = [];
    if (photo_base64) {
      const url = saveBase64File(photo_base64, 'nc-publica');
      if (url) evidence_urls = [url];
    }

    const { rows } = await query(
      `INSERT INTO findings
         (title, description, finding_type, status, origin, area,
          immediate_action, evidence_urls, report_kind)
       VALUES ($1,$2,${kind === 'nc' ? `'nc_real'` : `'mejora'`},'abierto','desvio_operativo',$3,$4,$5,'${kind}')
       RETURNING id, code`,
      [
        description.substring(0, 120),
        `${description}\n\n---\nDetectó: ${detected_by || 'Anónimo'} ${detected_by_email ? '(' + detected_by_email + ')' : ''}\nAfectó cliente: ${affected_client || 'No'}\nReclamo cliente: ${client_complaint || 'No'}\nAcción inmediata requerida: ${immediate_action_required || 'No'}\nEstado actual: ${current_status || ''}\nComentarios: ${comments || ''}`,
        area,
        immediate_action || null,
        evidence_urls.length ? evidence_urls : null
      ]
    );

    // Notificación in-app a SGI leaders y admins
    const { rows: admins } = await query(
      `SELECT id FROM users WHERE role IN ('master_admin','director','sgi_leader') AND is_active = true`
    );
    for (const admin of admins) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, source_module)
         VALUES ($1,$2,$3,'warning','findings')`,
        [admin.id,
         kind === 'nc' ? `Nueva NC pública: ${rows[0].code}` : `Nuevo hallazgo general: ${rows[0].code}`,
         `Sector: ${area} — ${description.substring(0, 80)}`]
      );
    }

    res.status(201).json({
      success: true,
      code: rows[0].code,
      message: kind === 'nc'
        ? 'No conformidad registrada correctamente'
        : 'Aviso/hallazgo registrado correctamente'
    });
  } catch (err) {
    console.error('Public NC error:', err);
    res.status(500).json({ error: 'Error al registrar la no conformidad' });
  }
});

export default router;
