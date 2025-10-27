-- ═══════════════════════════════════════════════════════════════════
-- OFlow 多行業支援系統
-- 版本：v1.0
-- 建立日期：2025-10-27
-- 說明：擴展系統以支援烘焙、美容美髮、按摩 SPA 等多種行業
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. 更新業務類別註解
-- ───────────────────────────────────────────────────────────────────
COMMENT ON COLUMN teams.business_type IS '業務類別：bakery(烘焙)、beauty(美容美髮)、massage(按摩SPA)、nail(美甲美睫)、flower(花店)、craft(手工藝)、pet(寵物美容)、other(其他)';

-- ───────────────────────────────────────────────────────────────────
-- 2. 新增訂單欄位（通用化支援商品型和服務型業務）
-- ───────────────────────────────────────────────────────────────────

-- 配送/服務方式欄位
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'pickup';

-- 商品型專用欄位（烘焙、花店等）
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS requires_frozen BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_info TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address TEXT;

-- 服務型專用欄位（美容美髮、按摩等）
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS service_duration INTEGER,
  ADD COLUMN IF NOT EXISTS service_notes TEXT;

-- ───────────────────────────────────────────────────────────────────
-- 3. 更新現有欄位註解（語意通用化）
-- ───────────────────────────────────────────────────────────────────

COMMENT ON COLUMN orders.pickup_date IS '預約/交付日期：商品型=客人期望收到的日期，服務型=預約日期';
COMMENT ON COLUMN orders.pickup_time IS '預約/交付時間：商品型=客人期望收到的時間，服務型=預約時間';
COMMENT ON COLUMN orders.delivery_method IS '配送/服務方式：pickup(自取)、convenience_store(超商取貨)、black_cat(黑貓宅配)、onsite(到店服務)';
COMMENT ON COLUMN orders.requires_frozen IS '是否需要冷凍配送（商品型專用）';
COMMENT ON COLUMN orders.store_info IS '超商店號/店名（超商取貨專用）';
COMMENT ON COLUMN orders.shipping_address IS '寄送地址（宅配專用）';
COMMENT ON COLUMN orders.service_duration IS '服務時長（分鐘）（服務型專用）';
COMMENT ON COLUMN orders.service_notes IS '服務備註（如：頭髮長度、過敏資訊）（服務型專用）';

-- ───────────────────────────────────────────────────────────────────
-- 4. 建立索引（提升查詢效能）
-- ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_delivery_method ON orders(delivery_method);
CREATE INDEX IF NOT EXISTS idx_teams_business_type ON teams(business_type);

-- 複合索引：常見查詢組合
CREATE INDEX IF NOT EXISTS idx_orders_team_delivery ON orders(team_id, delivery_method);

-- ───────────────────────────────────────────────────────────────────
-- 5. 棄用舊欄位（保留但標記為已棄用）
-- ───────────────────────────────────────────────────────────────────

COMMENT ON COLUMN orders.pickup_method IS '已棄用，請使用 delivery_method';
COMMENT ON COLUMN orders.delivery_address IS '已棄用，請使用 shipping_address';

-- ═══════════════════════════════════════════════════════════════════
-- 完成訊息
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ 多行業支援系統已建立！';
  RAISE NOTICE '✅ 已新增欄位：';
  RAISE NOTICE '  - delivery_method (配送/服務方式)';
  RAISE NOTICE '  - requires_frozen (冷凍配送)';
  RAISE NOTICE '  - store_info (超商店號)';
  RAISE NOTICE '  - shipping_address (寄送地址)';
  RAISE NOTICE '  - service_duration (服務時長)';
  RAISE NOTICE '  - service_notes (服務備註)';
  RAISE NOTICE '✅ 已建立索引提升查詢效能';
  RAISE NOTICE '✅ 已更新欄位註解為通用語意';
END $$;

