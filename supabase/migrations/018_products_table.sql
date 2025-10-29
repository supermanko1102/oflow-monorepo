-- ═══════════════════════════════════════════════════════════════════
-- OFlow 商品管理系統
-- 版本：v1.0
-- 建立日期：2025-10-29
-- 說明：通用商品表，支援多行業彈性擴展，整合 AI 智能推薦
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- Table: products（商品）
-- 說明：屬於團隊，支援烘焙、美容、按摩等多行業通用管理
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  
  -- 基本資訊（所有行業通用）
  name TEXT NOT NULL,                  -- 商品名稱（如：巴斯克蛋糕 6吋、剪髮服務）
  price DECIMAL(10,2) NOT NULL,        -- 價格
  description TEXT,                    -- 商品描述
  
  -- 分類與單位（行業自訂）
  category TEXT NOT NULL,              -- 分類（烘焙：蛋糕/麵包；美容：剪髮/染髮）
  unit TEXT NOT NULL DEFAULT '個',     -- 單位（個/份/次/小時/盒/條）
  
  -- 庫存管理（可選，服務型行業可不使用）
  stock INT,                           -- 庫存數量（NULL = 不追蹤庫存）
  low_stock_threshold INT,             -- 低庫存警告門檻
  
  -- 狀態
  is_available BOOLEAN DEFAULT true,   -- 是否上架（可販售）
  
  -- 行業特定資料（彈性擴展）⭐
  metadata JSONB DEFAULT '{}',         -- 行業特定欄位
  -- 烘焙業範例：{"allergens": ["蛋", "奶"], "storage": "refrigerated", "shelf_life_days": 3}
  -- 美容業範例：{"duration_minutes": 90, "stylist_level": "senior", "suitable_for": ["長髮", "中髮"]}
  -- 按摩業範例：{"duration_minutes": 60, "massage_type": "oil", "suitable_for": ["全身", "局部"]}
  
  -- 排序與顯示
  sort_order INT DEFAULT 0,            -- 自訂排序順序（數字越小越前面）
  image_url TEXT,                      -- 商品圖片 URL（未來擴展）
  
  -- 統計（快取）
  total_sold INT DEFAULT 0,            -- 總銷售數量（未來擴展）
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- 索引設計
-- ───────────────────────────────────────────────────────────────────

-- 基礎索引
CREATE INDEX idx_products_team_id ON products(team_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_available ON products(is_available);

-- 複合索引（常見查詢優化）
CREATE INDEX idx_products_team_available ON products(team_id, is_available);
CREATE INDEX idx_products_team_category ON products(team_id, category);
CREATE INDEX idx_products_team_sort ON products(team_id, sort_order);

-- 部分索引（只索引上架商品，用於 AI 查詢）
CREATE INDEX idx_products_team_available_only ON products(team_id, category, name) 
  WHERE is_available = true;

-- ───────────────────────────────────────────────────────────────────
-- RLS 安全策略
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 團隊成員可以查看團隊的商品
CREATE POLICY "Team members can view products"
  ON products FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

-- 有訂單管理權限的成員可以管理商品（複用 can_manage_orders 權限）
CREATE POLICY "Team members can manage products"
  ON products FOR ALL
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND tm.can_manage_orders = true
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND tm.can_manage_orders = true
    )
  );

-- ───────────────────────────────────────────────────────────────────
-- Trigger：自動更新 updated_at
-- ───────────────────────────────────────────────────────────────────

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ───────────────────────────────────────────────────────────────────
-- 註解
-- ───────────────────────────────────────────────────────────────────

COMMENT ON TABLE products IS '商品表 - 支援多行業通用管理（烘焙、美容、按摩等）';
COMMENT ON COLUMN products.team_id IS '所屬團隊 ID';
COMMENT ON COLUMN products.name IS '商品名稱（如：巴斯克蛋糕 6吋、剪髮服務）';
COMMENT ON COLUMN products.category IS '商品分類（行業自訂）：烘焙=蛋糕/麵包；美容=剪髮/染髮；按摩=全身/局部';
COMMENT ON COLUMN products.unit IS '單位：個/份/次/小時/盒/條（行業自訂）';
COMMENT ON COLUMN products.stock IS '庫存數量（NULL = 不追蹤庫存，適用於服務型行業）';
COMMENT ON COLUMN products.metadata IS '行業特定資料（JSONB）：烘焙=過敏原、保存方式；美容=服務時長、適合髮質；按摩=按摩類型、適合部位';
COMMENT ON COLUMN products.is_available IS '是否上架（AI 只會推薦上架商品）';

-- ═══════════════════════════════════════════════════════════════════
-- 完成訊息
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ OFlow 商品管理系統建立完成！';
  RAISE NOTICE '✅ 已建立：';
  RAISE NOTICE '  - products 表（通用設計 + JSONB 彈性擴展）';
  RAISE NOTICE '  - 6 個索引（含複合索引和部分索引）';
  RAISE NOTICE '  - RLS 政策（team-based 權限）';
  RAISE NOTICE '  - Trigger（自動更新 updated_at）';
  RAISE NOTICE '✅ 支援多行業：烘焙、美容、按摩、美甲、花店等';
  RAISE NOTICE '✅ AI 整合就緒：可透過 team_id 查詢上架商品';
END $$;

