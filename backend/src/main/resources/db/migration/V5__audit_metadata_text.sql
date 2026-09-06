ALTER TABLE audit_logs
    ALTER COLUMN metadata TYPE TEXT USING metadata::text;

ALTER TABLE analytics_events
    ALTER COLUMN metadata TYPE TEXT USING metadata::text;
