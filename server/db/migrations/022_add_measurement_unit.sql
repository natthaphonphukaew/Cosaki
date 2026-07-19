-- Migration 022: Add measurement_unit and change bust, waist, hip to VARCHAR to support ranges (e.g. 90-95)
ALTER TABLE items ADD COLUMN IF NOT EXISTS measurement_unit VARCHAR(10) DEFAULT 'cm';

-- Alter existing integer columns to varchar
ALTER TABLE items ALTER COLUMN bust TYPE VARCHAR(50) USING bust::varchar;
ALTER TABLE items ALTER COLUMN waist TYPE VARCHAR(50) USING waist::varchar;
ALTER TABLE items ALTER COLUMN hip TYPE VARCHAR(50) USING hip::varchar;
