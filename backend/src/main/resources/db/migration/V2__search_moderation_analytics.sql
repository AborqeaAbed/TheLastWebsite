ALTER TABLE spots
    ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE verification_tokens
    ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) NOT NULL DEFAULT 'CLAIM';

CREATE INDEX IF NOT EXISTS idx_spots_moderation_status ON spots(moderation_status);
CREATE INDEX IF NOT EXISTS idx_spots_reserved_until ON spots(reserved_until);
CREATE INDEX IF NOT EXISTS idx_spots_xy ON spots(x, y);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_spots_name_trgm ON spots USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_spots_message_trgm ON spots USING gin (message gin_trgm_ops);

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(100) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
