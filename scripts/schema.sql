CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
  password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('teacher','student')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id), code text NOT NULL UNIQUE,
  data jsonb NOT NULL, version integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS assignments_owner ON assignments(owner_id);
CREATE INDEX IF NOT EXISTS assignments_students ON assignments USING gin ((data->'students'));

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('assignment_opened','deadline_reminder','results_finalized')),
  event_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  UNIQUE(user_id,event_key)
);
CREATE INDEX IF NOT EXISTS notifications_inbox ON notifications(user_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS notifications_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_assignment ON notifications(assignment_id);

CREATE TABLE IF NOT EXISTS classrooms (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id), slug text NOT NULL UNIQUE,
  data jsonb NOT NULL, version integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS classrooms_owner ON classrooms(owner_id);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 1,
  reset_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_rate_limits_expiry ON auth_rate_limits(reset_at);

CREATE TABLE IF NOT EXISTS e2e_test_runs (
  run_id uuid PRIMARY KEY,
  user_ids jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  classroom_id uuid REFERENCES classrooms(id) ON DELETE SET NULL,
  assignment_id uuid REFERENCES assignments(id) ON DELETE SET NULL,
  before_state jsonb,
  after_state jsonb,
  reason text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_classroom ON audit_logs(classroom_id);
CREATE INDEX IF NOT EXISTS audit_logs_assignment ON audit_logs(assignment_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at ON audit_logs(created_at);
