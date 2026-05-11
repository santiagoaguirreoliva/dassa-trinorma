-- =============================================================================
-- DASSA SGI · OLA 1 · Migration 011 · Fix bug ILIKE Manuel matchea Emmanuel
-- =============================================================================
DELETE FROM job_profile_employees
WHERE employee_id IN (SELECT id FROM employees WHERE full_name ILIKE 'Emmanuel%')
  AND profile_id IN ('a0000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003');
