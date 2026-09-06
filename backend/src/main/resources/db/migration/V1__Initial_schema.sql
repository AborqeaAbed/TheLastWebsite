-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create spots table
CREATE TABLE IF NOT EXISTS spots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spot_number INTEGER UNIQUE NOT NULL CHECK (spot_number BETWEEN 1 AND 1000000),
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255),
    message TEXT,
    reserved_until TIMESTAMP,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spot_id UUID NOT NULL REFERENCES spots(id),
    user_id UUID REFERENCES users(id),
    stripe_payment_id VARCHAR(255) UNIQUE,
    amount INTEGER NOT NULL, -- Stored in smallest currency unit (cents)
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create verification_tokens table
CREATE TABLE IF NOT EXISTS verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    spot_id UUID REFERENCES spots(id),
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    spot_id UUID REFERENCES spots(id),
    action VARCHAR(100) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_spots_spot_number ON spots(spot_number);
CREATE INDEX IF NOT EXISTS idx_spots_status ON spots(status);
CREATE INDEX IF NOT EXISTS idx_spots_user_id ON spots(user_id);
CREATE INDEX IF NOT EXISTS idx_spots_claimed_at ON spots(claimed_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_id ON payments(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token_hash ON verification_tokens(token_hash);

-- Create a function to generate deterministic coordinates for spots
CREATE OR REPLACE FUNCTION generate_spot_coordinates(spot_num INTEGER)
RETURNS TABLE(x DOUBLE PRECISION, y DOUBLE PRECISION) AS $$
BEGIN
    -- Simple deterministic algorithm: use the spot number to generate coordinates
    -- This ensures reproducible positions for all spots
    RETURN QUERY 
        SELECT 
            (spot_num % 1000) * 0.001 + 0.001 AS x,
            floor(spot_num / 1000.0) * 0.001 + 0.001 AS y;
END;
$$ LANGUAGE plpgsql;

INSERT INTO spots (spot_number, x, y, status)
SELECT
    gs AS spot_number,
    (gs % 1000) * 0.001 + 0.001 AS x,
    floor(gs / 1000.0) * 0.001 + 0.001 AS y,
    'AVAILABLE' AS status
FROM generate_series(1, 1000000) AS gs
ON CONFLICT (spot_number) DO NOTHING;