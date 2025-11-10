-- ───────────────────────────────────────────────────────────────────
-- Migration: 新增配送設定（區分店取/面交）
-- Date: 2025-11-10
-- Description: 
--   1. 在 team_settings 新增 pickup_settings（店取/面交設定）
--   2. 新增 enable_convenience_store、enable_black_cat 開關
--   3. 在 orders 新增 pickup_type、pickup_location 欄位
-- ───────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════
-- 1. team_settings 新增配送設定
-- ═══════════════════════════════════════════════════════════════════

-- 新增取貨設定（店取/面交）
ALTER TABLE team_settings 
ADD COLUMN IF NOT EXISTS pickup_settings JSONB DEFAULT '{
  "store_pickup": {
    "enabled": false,
    "address": null,
    "business_hours": null
  },
  "meetup": {
    "enabled": false,
    "available_areas": [],
    "note": null
  }
}'::jsonb;

-- 新增配送方式開關
ALTER TABLE team_settings 
ADD COLUMN IF NOT EXISTS enable_convenience_store BOOLEAN DEFAULT true;

ALTER TABLE team_settings 
ADD COLUMN IF NOT EXISTS enable_black_cat BOOLEAN DEFAULT true;

-- 註解
COMMENT ON COLUMN team_settings.pickup_settings IS '取貨設定：store_pickup（店取）和 meetup（面交）';
COMMENT ON COLUMN team_settings.enable_convenience_store IS '是否啟用超商取貨';
COMMENT ON COLUMN team_settings.enable_black_cat IS '是否啟用宅配（黑貓）';

-- ═══════════════════════════════════════════════════════════════════
-- 2. orders 新增取貨類型和地點
-- ═══════════════════════════════════════════════════════════════════

-- 新增取貨類型（store/meetup）
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS pickup_type TEXT;

-- 新增取貨/面交地點
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS pickup_location TEXT;

-- 註解
COMMENT ON COLUMN orders.pickup_type IS '取貨類型：store（店取）或 meetup（面交），僅當 delivery_method=pickup 時有值';
COMMENT ON COLUMN orders.pickup_location IS '實際取貨或面交地點';

-- 索引（用於查詢特定取貨類型的訂單）
CREATE INDEX IF NOT EXISTS idx_orders_pickup_type ON orders(pickup_type) WHERE pickup_type IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 3. 更新現有資料（可選）
-- ═══════════════════════════════════════════════════════════════════

-- 為現有的 pickup 訂單設定預設 pickup_type 為 'store'
UPDATE orders 
SET pickup_type = 'store' 
WHERE delivery_method = 'pickup' 
  AND pickup_type IS NULL;

