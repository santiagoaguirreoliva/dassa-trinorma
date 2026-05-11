BEGIN;

INSERT INTO review_cycles (id, year, name, status, opened_at, notes)
VALUES ('2026aaaa-2026-2026-2026-202620262026', 2026, 'Ciclo 2026 · TRINORMA', 'en_progreso', NOW(),
        'Ciclo abierto el 11/05/2026 · validaciones encadenadas con NIXA')
ON CONFLICT (year) DO UPDATE SET status = 'en_progreso';

DO $$
DECLARE
  v_cycle_id      UUID := '2026aaaa-2026-2026-2026-202620262026';
  v_template      RECORD;
  v_nixa_id       UUID;
  v_role_user_id  UUID;
BEGIN
  SELECT id INTO v_nixa_id FROM users WHERE role::text = 'auditor_externo' LIMIT 1;

  FOR v_template IN SELECT * FROM review_templates ORDER BY sort_order LOOP
    SELECT id INTO v_role_user_id FROM users
     WHERE role::text = v_template.default_reviewer_role AND is_active = TRUE LIMIT 1;

    INSERT INTO reviews (entity_type, entity_id, scheduled_for, period_kind, reviewer_id, validator_id, status, cycle_id, metadata)
    VALUES (
      v_template.entity_type, v_cycle_id, DATE '2026-12-31', 'anual',
      v_role_user_id, v_nixa_id, 'programada', v_cycle_id,
      jsonb_build_object('template_id', v_template.id, 'is_cycle_master_review', TRUE, 'description', v_template.description)
    );
  END LOOP;
END $$;

INSERT INTO review_dependencies (parent_review_id, child_review_id, dep_type)
SELECT parent_r.id, child_r.id, 'blocking'
FROM reviews child_r
JOIN review_templates child_t ON child_t.entity_type = child_r.entity_type
CROSS JOIN LATERAL UNNEST(child_t.depends_on_entity_types) AS dep_type
JOIN reviews parent_r ON parent_r.entity_type = dep_type AND parent_r.cycle_id = child_r.cycle_id
WHERE child_r.cycle_id = '2026aaaa-2026-2026-2026-202620262026'
ON CONFLICT (parent_review_id, child_review_id) DO NOTHING;

UPDATE reviews SET status = 'bloqueada'
WHERE cycle_id = '2026aaaa-2026-2026-2026-202620262026'
  AND review_is_blocked(id);

COMMIT;

SELECT '────── Ciclo 2026 + revisiones encadenadas ──────' AS info;
SELECT
  rt.sort_order AS "#",
  r.entity_type,
  r.status,
  u_rev.full_name AS reviewer,
  u_val.full_name AS validator,
  (SELECT COUNT(*) FROM review_dependencies WHERE child_review_id = r.id) AS deps
FROM reviews r
JOIN review_templates rt ON rt.entity_type = r.entity_type
LEFT JOIN users u_rev ON u_rev.id = r.reviewer_id
LEFT JOIN users u_val ON u_val.id = r.validator_id
WHERE r.cycle_id = '2026aaaa-2026-2026-2026-202620262026'
ORDER BY rt.sort_order;

SELECT '────── DAG ──────' AS info;
SELECT parent.entity_type || ' → ' || child.entity_type AS dependencia
FROM review_dependencies rd
JOIN reviews parent ON parent.id = rd.parent_review_id
JOIN reviews child ON child.id = rd.child_review_id
WHERE parent.cycle_id = '2026aaaa-2026-2026-2026-202620262026'
ORDER BY parent.entity_type, child.entity_type;
