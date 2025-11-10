-- 022_add_payment_method.sql
-- 為 orders 表添加付款方式欄位，支援現金/轉帳/其他三種方式

-- 添加付款方式欄位
ALTER TABLE orders
ADD COLUMN payment_method TEXT CHECK (payment_method IN ('cash', 'transfer', 'other'));

-- 為現有訂單設定預設值（已完成的訂單預設為現金）
UPDATE orders
SET payment_method = 'cash'
WHERE status = 'completed' AND payment_method IS NULL;

-- 添加註解
COMMENT ON COLUMN orders.payment_method IS '付款方式：cash(現金), transfer(轉帳), other(其他)';

-- 建立索引以優化按付款方式查詢的效能
CREATE INDEX idx_orders_payment_method ON orders(payment_method) WHERE payment_method IS NOT NULL;

-- 建立複合索引以優化營收統計查詢
CREATE INDEX idx_orders_completed_payment ON orders(team_id, status, payment_method, pickup_date)
WHERE status = 'completed';

