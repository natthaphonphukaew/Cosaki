-- Migration 024: intentional no-op.
-- items.express_delivery already exists (migration 016, DEFAULT FALSE). The
-- original `ADD COLUMN IF NOT EXISTS ... DEFAULT TRUE` never took effect (the
-- column exists, so the whole statement was skipped) — which was actually the
-- desired outcome: express stays OPT-IN per listing (toggled in the Add/Edit
-- Product form), because not every shop can offer same-province express.
-- Kept as a no-op to preserve migration numbering.
SELECT 1;
