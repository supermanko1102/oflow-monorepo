-- AI 使用量追蹤表
CREATE TABLE IF NOT EXISTS public.ai_usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  line_user_id TEXT, -- 僅用於記錄日誌，不參與限制邏輯
  request_type TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 啟用 RLS
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- 索引：快速查詢團隊使用量
CREATE INDEX IF NOT EXISTS idx_ai_usage_team_time ON public.ai_usage_tracking(team_id, created_at DESC);

COMMENT ON TABLE public.ai_usage_tracking IS 'AI API 使用量追蹤，用於成本控制和速率限制';

-- 團隊 AI 配額設定（加入 teams 表）
ALTER TABLE public.teams 
  ADD COLUMN IF NOT EXISTS ai_daily_limit INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS ai_monthly_limit INTEGER DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS ai_rate_limit_per_minute INTEGER DEFAULT 20, -- 新增：每分鐘限制
  ADD COLUMN IF NOT EXISTS ai_enabled_until TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.teams.ai_daily_limit IS 'AI 每日請求上限（預設 100 次/天）';
COMMENT ON COLUMN public.teams.ai_monthly_limit IS 'AI 每月請求上限（預設 2000 次/月）';
COMMENT ON COLUMN public.teams.ai_rate_limit_per_minute IS 'AI 每分鐘請求上限（預設 20 次/分）';
COMMENT ON COLUMN public.teams.ai_enabled_until IS 'AI 功能啟用截止時間（NULL = 永久啟用）';

-- 檢查團隊 AI 配額的函數 (簡化版)
CREATE OR REPLACE FUNCTION public.check_team_ai_quota(
  p_team_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_team RECORD;
  v_daily_count INTEGER;
  v_monthly_count INTEGER;
  v_minute_count INTEGER;
BEGIN
  -- 取得團隊設定
  SELECT ai_daily_limit, ai_monthly_limit, ai_rate_limit_per_minute, ai_enabled_until
  INTO v_team
  FROM teams
  WHERE id = p_team_id;

  IF v_team IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'team_not_found');
  END IF;

  -- 1. 檢查 AI 功能是否啟用
  IF v_team.ai_enabled_until IS NOT NULL AND v_team.ai_enabled_until < NOW() THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'ai_disabled',
      'message', 'AI 功能已停用，請聯繫管理員'
    );
  END IF;

  -- 2. 檢查每分鐘速率限制 (防止瞬間爆量)
  SELECT COUNT(*) INTO v_minute_count
  FROM ai_usage_tracking
  WHERE team_id = p_team_id
    AND created_at >= NOW() - INTERVAL '1 minute';
    
  IF v_minute_count >= v_team.ai_rate_limit_per_minute THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'message', '系統繁忙，請稍後再試',
      'minute_used', v_minute_count,
      'minute_limit', v_team.ai_rate_limit_per_minute
    );
  END IF;

  -- 3. 檢查今日使用量
  SELECT COUNT(*) INTO v_daily_count
  FROM ai_usage_tracking
  WHERE team_id = p_team_id
    AND created_at >= CURRENT_DATE;

  IF v_daily_count >= v_team.ai_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit_exceeded',
      'message', '今日 AI 使用量已達上限',
      'daily_used', v_daily_count,
      'daily_limit', v_team.ai_daily_limit
    );
  END IF;

  -- 4. 檢查本月使用量
  SELECT COUNT(*) INTO v_monthly_count
  FROM ai_usage_tracking
  WHERE team_id = p_team_id
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

  IF v_monthly_count >= v_team.ai_monthly_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'monthly_limit_exceeded',
      'message', '本月 AI 使用量已達上限',
      'monthly_used', v_monthly_count,
      'monthly_limit', v_team.ai_monthly_limit
    );
  END IF;

  -- 允許請求
  RETURN jsonb_build_object(
    'allowed', true,
    'daily_used', v_daily_count,
    'daily_limit', v_team.ai_daily_limit,
    'monthly_used', v_monthly_count,
    'monthly_limit', v_team.ai_monthly_limit
  );
END;
$$;

COMMENT ON FUNCTION public.check_team_ai_quota IS '檢查團隊 AI 配額（包含每日、每月、每分鐘限制）';

-- 記錄 AI 使用量的函數 (簡化版)
CREATE OR REPLACE FUNCTION public.record_ai_usage(
  p_team_id UUID,
  p_line_user_id TEXT,
  p_request_type TEXT,
  p_tokens_used INTEGER DEFAULT 0,
  p_cost_usd NUMERIC DEFAULT 0
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 只記錄使用量，不處理用戶速率限制
  INSERT INTO ai_usage_tracking (team_id, line_user_id, request_type, tokens_used, cost_usd)
  VALUES (p_team_id, p_line_user_id, p_request_type, p_tokens_used, p_cost_usd);
END;
$$;

COMMENT ON FUNCTION public.record_ai_usage IS '記錄 AI API 使用量';


-- AI 使用量統計視圖
CREATE OR REPLACE VIEW public.ai_usage_stats WITH (security_invoker = true) AS
SELECT 
  t.id AS team_id,
  t.name AS team_name,
  t.ai_daily_limit,
  t.ai_monthly_limit,
  t.ai_rate_limit_per_minute,
  
  -- 今日使用量
  COUNT(CASE WHEN aut.created_at >= CURRENT_DATE THEN 1 END) AS daily_used,
  t.ai_daily_limit - COUNT(CASE WHEN aut.created_at >= CURRENT_DATE THEN 1 END) AS daily_remaining,
  
  -- 本月使用量
  COUNT(CASE WHEN aut.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) AS monthly_used,
  t.ai_monthly_limit - COUNT(CASE WHEN aut.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) AS monthly_remaining,
  
  -- 成本統計
  COALESCE(SUM(CASE WHEN aut.created_at >= CURRENT_DATE THEN aut.cost_usd END), 0) AS daily_cost_usd,
  COALESCE(SUM(CASE WHEN aut.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN aut.cost_usd END), 0) AS monthly_cost_usd,
  
  -- Tokens 統計
  COALESCE(SUM(CASE WHEN aut.created_at >= CURRENT_DATE THEN aut.tokens_used END), 0) AS daily_tokens,
  COALESCE(SUM(CASE WHEN aut.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN aut.tokens_used END), 0) AS monthly_tokens,
  
  -- 最後使用時間
  MAX(aut.created_at) AS last_used_at
  
FROM public.teams t
LEFT JOIN public.ai_usage_tracking aut ON aut.team_id = t.id
GROUP BY t.id, t.name, t.ai_daily_limit, t.ai_monthly_limit, t.ai_rate_limit_per_minute;

COMMENT ON VIEW public.ai_usage_stats IS 'AI 使用量統計視圖（團隊維度）';

-- App 專用狀態視圖（包含布林值狀態）
CREATE OR REPLACE VIEW public.team_ai_status WITH (security_invoker = true) AS
SELECT 
  t.id AS team_id,
  
  -- 狀態標記 (App 直接讀取這些 Boolean)
  (COUNT(CASE WHEN aut.created_at >= CURRENT_DATE THEN 1 END) >= t.ai_daily_limit) AS is_daily_limit_reached,
  (COUNT(CASE WHEN aut.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) >= t.ai_monthly_limit) AS is_monthly_limit_reached,
  
  -- 詳細數據 (用於顯示進度條)
  COUNT(CASE WHEN aut.created_at >= CURRENT_DATE THEN 1 END) AS daily_used,
  t.ai_daily_limit,
  ROUND((COUNT(CASE WHEN aut.created_at >= CURRENT_DATE THEN 1 END)::NUMERIC / NULLIF(t.ai_daily_limit, 0) * 100), 1) AS daily_usage_percent,
  
  COUNT(CASE WHEN aut.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) AS monthly_used,
  t.ai_monthly_limit,
  ROUND((COUNT(CASE WHEN aut.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END)::NUMERIC / NULLIF(t.ai_monthly_limit, 0) * 100), 1) AS monthly_usage_percent

FROM public.teams t
LEFT JOIN public.ai_usage_tracking aut ON aut.team_id = t.id
GROUP BY t.id, t.ai_daily_limit, t.ai_monthly_limit;

COMMENT ON VIEW public.team_ai_status IS 'App 專用 AI 狀態視圖，提供是否達上限的布林值';

-- 管理員調整團隊 AI 配額
CREATE OR REPLACE FUNCTION public.admin_update_team_ai_quota(
  p_team_id UUID,
  p_daily_limit INTEGER DEFAULT NULL,
  p_monthly_limit INTEGER DEFAULT NULL,
  p_rate_limit_per_minute INTEGER DEFAULT NULL,
  p_ai_enabled_until TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_updated RECORD;
BEGIN
  UPDATE teams
  SET 
    ai_daily_limit = COALESCE(p_daily_limit, ai_daily_limit),
    ai_monthly_limit = COALESCE(p_monthly_limit, ai_monthly_limit),
    ai_rate_limit_per_minute = COALESCE(p_rate_limit_per_minute, ai_rate_limit_per_minute),
    ai_enabled_until = COALESCE(p_ai_enabled_until, ai_enabled_until),
    updated_at = NOW()
  WHERE id = p_team_id
  RETURNING id, name, ai_daily_limit, ai_monthly_limit, ai_rate_limit_per_minute, ai_enabled_until
  INTO v_updated;

  IF v_updated IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Team not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'team', jsonb_build_object(
      'id', v_updated.id,
      'name', v_updated.name,
      'ai_daily_limit', v_updated.ai_daily_limit,
      'ai_monthly_limit', v_updated.ai_monthly_limit,
      'ai_rate_limit_per_minute', v_updated.ai_rate_limit_per_minute,
      'ai_enabled_until', v_updated.ai_enabled_until
    )
  );
END;
$$;

COMMENT ON FUNCTION public.admin_update_team_ai_quota IS '管理員調整團隊 AI 配額';
