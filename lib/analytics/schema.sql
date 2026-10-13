CREATE TABLE IF NOT EXISTS dkla_profiles (
 id uuid PRIMARY KEY, handle text NOT NULL, colour text NOT NULL, glyph text NOT NULL,
 label text NOT NULL DEFAULT '', watched boolean NOT NULL DEFAULT false, excluded boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dkla_devices (
 id uuid PRIMARY KEY, profile_id uuid NOT NULL REFERENCES dkla_profiles(id) ON DELETE CASCADE,
 first_seen timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now(),
 scoring_allowed boolean NOT NULL DEFAULT true, metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS dkla_sessions (
 id uuid PRIMARY KEY, device_id uuid NOT NULL REFERENCES dkla_devices(id) ON DELETE CASCADE,
 started_at timestamptz NOT NULL, ended_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
 active_seconds integer NOT NULL DEFAULT 0, active_now boolean NOT NULL DEFAULT false, ip text NOT NULL DEFAULT '', country text NOT NULL DEFAULT '',
 region text NOT NULL DEFAULT '', city text NOT NULL DEFAULT '', postal text NOT NULL DEFAULT '',
 asn text NOT NULL DEFAULT '', network text NOT NULL DEFAULT '', geo_missing boolean NOT NULL DEFAULT false,
 tier text NOT NULL CHECK (tier = 'full'), build text NOT NULL DEFAULT '', metadata jsonb NOT NULL DEFAULT '{}',
 compacted boolean NOT NULL DEFAULT false, summary jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS dkla_sessions_device_time ON dkla_sessions(device_id, started_at DESC);
CREATE INDEX IF NOT EXISTS dkla_sessions_time ON dkla_sessions(started_at DESC);
ALTER TABLE dkla_sessions ADD COLUMN IF NOT EXISTS latitude double precision CHECK (latitude BETWEEN -90 AND 90);
ALTER TABLE dkla_sessions ADD COLUMN IF NOT EXISTS longitude double precision CHECK (longitude BETWEEN -180 AND 180);
CREATE TABLE IF NOT EXISTS dkla_events (
 id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES dkla_sessions(id) ON DELETE CASCADE,
 at timestamptz NOT NULL, kind text NOT NULL, entity text NOT NULL DEFAULT '', course text NOT NULL DEFAULT '',
 region_id text NOT NULL DEFAULT '', active_seconds integer NOT NULL DEFAULT 0, details jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS dkla_events_session_time ON dkla_events(session_id, at);
CREATE INDEX IF NOT EXISTS dkla_events_time_kind ON dkla_events(at, kind);
CREATE TABLE IF NOT EXISTS dkla_sync_links (
 digest text PRIMARY KEY, profile_id uuid NOT NULL REFERENCES dkla_profiles(id) ON DELETE CASCADE,
 verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dkla_merges (
 id uuid PRIMARY KEY, target uuid NOT NULL REFERENCES dkla_profiles(id) ON DELETE CASCADE,
 source uuid NOT NULL REFERENCES dkla_profiles(id) ON DELETE CASCADE, reason text NOT NULL,
 membership jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), undone_at timestamptz
);
CREATE TABLE IF NOT EXISTS dkla_reviews (
 pair text PRIMARY KEY, decision text NOT NULL CHECK (decision IN ('rejected','confirmed')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dkla_alerts (
 id uuid PRIMARY KEY, profile_id uuid NOT NULL REFERENCES dkla_profiles(id) ON DELETE CASCADE,
 session_id uuid NOT NULL UNIQUE REFERENCES dkla_sessions(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz, email_status text NOT NULL DEFAULT 'disabled'
);
CREATE TABLE IF NOT EXISTS dkla_privacy_requests (
 id uuid PRIMARY KEY, device_id uuid REFERENCES dkla_devices(id) ON DELETE SET NULL,
 request text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE TABLE IF NOT EXISTS dkla_admin_sessions (
 id uuid PRIMARY KEY, expires_at timestamptz NOT NULL, revoked boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS dkla_rate_limits (
 key text PRIMARY KEY, count integer NOT NULL DEFAULT 1, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS dkla_anonymous_totals (
 day date NOT NULL, build text NOT NULL, region text NOT NULL, entity text NOT NULL,
 visits integer NOT NULL DEFAULT 0, opens integer NOT NULL DEFAULT 0, PRIMARY KEY(day,build,region,entity)
);
CREATE TABLE IF NOT EXISTS dkla_anonymous_batches (id uuid PRIMARY KEY, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS dkla_storage_samples (day date PRIMARY KEY, bytes bigint NOT NULL);
CREATE TABLE IF NOT EXISTS dkla_tombstones (digest text PRIMARY KEY, deleted_at timestamptz NOT NULL DEFAULT now());
CREATE OR REPLACE VIEW dkla_all_events AS
 SELECT id,session_id,at,kind,entity,course,region_id,active_seconds,details FROM dkla_events
 UNION ALL
 SELECT e.id,s.id,e.at,e.kind,e.entity,e.course,e.region_id,e.active_seconds,e.details
 FROM dkla_sessions s CROSS JOIN LATERAL jsonb_to_recordset(s.summary->'events')
 AS e(id uuid,at timestamptz,kind text,entity text,course text,region_id text,active_seconds integer,details jsonb)
 WHERE s.compacted;
