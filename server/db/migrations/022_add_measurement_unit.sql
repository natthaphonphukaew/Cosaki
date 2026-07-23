-- Migration 022: measurement unit label for item sizing.
-- NOTE: bust/waist/hip stay INTEGER (cm). The search filter in
-- item.controller.searchItems matches with ABS(i.bust - $n) <= 6, which needs
-- numeric columns — converting them to VARCHAR broke that filter and the
-- renter↔item size match. So we only add the unit label here; display-side
-- unit conversion (cm↔inch) is handled in the client (ProductDetail).
ALTER TABLE items ADD COLUMN IF NOT EXISTS measurement_unit VARCHAR(10) DEFAULT 'cm';
