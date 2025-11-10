-- ═══════════════════════════════════════════════════════════════════
-- Migration: 023_add_paid_at
-- 版本：v1.0
-- 建立日期：2025-11-10
-- 說明：在 orders 表中新增 paid_at 欄位，用於記錄付款確認時間
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- 檢查欄位是否存在，避免重複添加
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'paid_at') THEN
    ALTER TABLE orders ADD COLUMN paid_at TIMESTAMP;

    RAISE NOTICE '[Migration 023] ✅ 已在 orders 表中新增 paid_at 欄位';
  ELSE
    RAISE NOTICE '[Migration 023] 欄位 paid_at 已存在，跳過新增';
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────
-- 為現有已付款/已完成的訂單設定 paid_at 時間
-- ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- 為 status = 'paid' 且 paid_at 為 NULL 的訂單，設定 paid_at = confirmed_at 或 created_at
  UPDATE orders
  SET paid_at = COALESCE(confirmed_at, created_at)
  WHERE status = 'paid' AND paid_at IS NULL;

  -- 為 status = 'completed' 且 paid_at 為 NULL 的訂單，設定 paid_at = completed_at 或 created_at
  UPDATE orders
  SET paid_at = COALESCE(completed_at, created_at)
  WHERE status = 'completed' AND paid_at IS NULL;

  RAISE NOTICE '[Migration 023] ✅ 已為現有訂單設定 paid_at 時間';
END $$;

-- ───────────────────────────────────────────────────────────────────
-- 添加註解
-- ───────────────────────────────────────────────────────────────────

COMMENT ON COLUMN orders.paid_at IS '付款確認時間：商家確認收到款項的時間';

-- ───────────────────────────────────────────────────────────────────
-- 建立索引以優化查詢效能
-- ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at) WHERE paid_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 完成訊息
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Migration 023 完成！';
  RAISE NOTICE '✅ orders 表已更新，新增 paid_at 欄位';
  RAISE NOTICE '✅ 現有訂單的 paid_at 時間已設定';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

