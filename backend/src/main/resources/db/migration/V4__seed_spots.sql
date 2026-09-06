ALTER TABLE spots ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE spots ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE spots ALTER COLUMN updated_at SET DEFAULT NOW();

INSERT INTO spots (spot_number, x, y, status)
SELECT
    gs AS spot_number,
    (gs % 1000) * 0.001 + 0.001 AS x,
    floor(gs / 1000.0) * 0.001 + 0.001 AS y,
    'AVAILABLE' AS status
FROM generate_series(1, 1000000) AS gs
ON CONFLICT (spot_number) DO NOTHING;
