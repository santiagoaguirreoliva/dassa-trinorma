CREATE INDEX IF NOT EXISTS idx_findings_reported_by ON findings(reported_by);
CREATE INDEX IF NOT EXISTS idx_findings_assigned_to ON findings(assigned_to);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_purchases_requested_by ON purchases(requested_by);
CREATE INDEX IF NOT EXISTS idx_incidents_type_status ON incidents(type, status);
CREATE INDEX IF NOT EXISTS idx_trainings_status_date ON trainings(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
