-- Migration 016: richer listing details (PRD §2.2 PDP, §3.2 Listing).
-- Costume measurements, recommended height, SLA windows, badges, return couriers.
ALTER TABLE items ADD COLUMN IF NOT EXISTS bust               INTEGER;
ALTER TABLE items ADD COLUMN IF NOT EXISTS waist              INTEGER;
ALTER TABLE items ADD COLUMN IF NOT EXISTS hip                INTEGER;
ALTER TABLE items ADD COLUMN IF NOT EXISTS height_recommended VARCHAR(50);        -- e.g. "155-170 ซม."
ALTER TABLE items ADD COLUMN IF NOT EXISTS ship_lead_days     INTEGER NOT NULL DEFAULT 2;  -- ส่งถึงก่อนใช้ N วัน
ALTER TABLE items ADD COLUMN IF NOT EXISTS return_days        INTEGER NOT NULL DEFAULT 2;  -- ส่งคืนภายใน N วันหลังใช้
ALTER TABLE items ADD COLUMN IF NOT EXISTS allow_event        BOOLEAN NOT NULL DEFAULT FALSE; -- ออกงาน/เต้น
ALTER TABLE items ADD COLUMN IF NOT EXISTS express_delivery   BOOLEAN NOT NULL DEFAULT FALSE; -- ส่งด่วนในจังหวัด
ALTER TABLE items ADD COLUMN IF NOT EXISTS return_couriers    TEXT[] NOT NULL DEFAULT '{}';   -- Flash/EMS/Kerry...
