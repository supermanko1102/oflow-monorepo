-- 針對對話 AI 回覆做節流記錄
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_ai_reply_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_ai_intent_hash TEXT DEFAULT NULL;

COMMENT ON COLUMN public.conversations.last_ai_reply_at IS '最後一次 AI 回覆的時間，用於節流';
COMMENT ON COLUMN public.conversations.last_ai_intent_hash IS '最後一次 AI 回覆的意圖/內容摘要，用於判斷是否需要立即回覆';

-- 以單一條件更新確保併發時只有一個請求能取得回覆權
CREATE OR REPLACE FUNCTION public.reserve_ai_reply_slot(
  p_conversation_id UUID,
  p_intent_hash TEXT,
  p_cooldown_seconds INTEGER DEFAULT 3
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id UUID;
BEGIN
  UPDATE public.conversations
  SET
    last_ai_reply_at = NOW(),
    last_ai_intent_hash = p_intent_hash,
    updated_at = NOW()
  WHERE id = p_conversation_id
    AND (
      last_ai_reply_at IS NULL
      OR last_ai_reply_at < NOW() - MAKE_INTERVAL(secs => COALESCE(p_cooldown_seconds, 3))
      OR last_ai_intent_hash IS DISTINCT FROM p_intent_hash
    )
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN FALSE; -- 沒搶到回覆權
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.reserve_ai_reply_slot IS '併發安全地保留 AI 回覆權：意圖不同或超過冷卻秒數才允許回覆';
