-- ═══════════════════════════════════════════════════════════════════
-- 帳號刪除功能（永久刪除）
-- 版本：v1.0
-- 建立日期：2025-11-07
-- 說明：符合 Apple App Store 審核要求 (Guidelines 5.1.1v)
--       如果用戶是團隊唯一 owner，將自動刪除該團隊
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 刪除用戶帳號（永久刪除）
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_user_account(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_team_record RECORD;
  v_team_member_count INT;
BEGIN
  RAISE NOTICE '開始刪除用戶帳號: %', p_user_id;

  -- 1. 處理用戶所屬的所有團隊
  FOR v_team_record IN 
    SELECT tm.team_id, tm.role, t.name as team_name
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id = p_user_id
  LOOP
    RAISE NOTICE '處理團隊: % (角色: %)', v_team_record.team_name, v_team_record.role;

    -- 如果是 owner，檢查是否為唯一 owner
    IF v_team_record.role = 'owner' THEN
      -- 計算該團隊的成員數
      SELECT COUNT(*) INTO v_team_member_count
      FROM team_members
      WHERE team_id = v_team_record.team_id;

      RAISE NOTICE '團隊 % 成員數: %', v_team_record.team_name, v_team_member_count;

      -- 如果是唯一成員（唯一 owner），刪除整個團隊
      IF v_team_member_count = 1 THEN
        RAISE NOTICE '用戶是團隊 % 的唯一成員，刪除整個團隊', v_team_record.team_name;
        DELETE FROM teams WHERE id = v_team_record.team_id;
      ELSE
        -- 如果團隊有其他成員，嘗試將 owner 轉移給第一個 admin
        DECLARE
          v_new_owner_id UUID;
        BEGIN
          SELECT user_id INTO v_new_owner_id
          FROM team_members
          WHERE team_id = v_team_record.team_id 
            AND user_id != p_user_id
            AND role = 'admin'
          LIMIT 1;

          IF v_new_owner_id IS NOT NULL THEN
            -- 轉移 owner 給 admin
            RAISE NOTICE '將團隊 % 的 owner 轉移給 admin: %', v_team_record.team_name, v_new_owner_id;
            UPDATE team_members
            SET role = 'owner'
            WHERE team_id = v_team_record.team_id AND user_id = v_new_owner_id;
            
            -- 刪除該用戶的成員記錄
            DELETE FROM team_members
            WHERE team_id = v_team_record.team_id AND user_id = p_user_id;
          ELSE
            -- 沒有 admin 可以接手，將 owner 轉移給第一個 member
            SELECT user_id INTO v_new_owner_id
            FROM team_members
            WHERE team_id = v_team_record.team_id 
              AND user_id != p_user_id
            LIMIT 1;

            IF v_new_owner_id IS NOT NULL THEN
              RAISE NOTICE '將團隊 % 的 owner 轉移給 member: %', v_team_record.team_name, v_new_owner_id;
              UPDATE team_members
              SET role = 'owner'
              WHERE team_id = v_team_record.team_id AND user_id = v_new_owner_id;
              
              -- 刪除該用戶的成員記錄
              DELETE FROM team_members
              WHERE team_id = v_team_record.team_id AND user_id = p_user_id;
            ELSE
              -- 理論上不應該到這裡
              RAISE NOTICE '無法找到接手者，刪除整個團隊';
              DELETE FROM teams WHERE id = v_team_record.team_id;
            END IF;
          END IF;
        END;
      END IF;
    ELSE
      -- 如果不是 owner，直接移除成員記錄
      RAISE NOTICE '從團隊 % 移除成員', v_team_record.team_name;
      DELETE FROM team_members
      WHERE team_id = v_team_record.team_id AND user_id = p_user_id;
    END IF;
  END LOOP;

  -- 2. 刪除 public.users 記錄
  RAISE NOTICE '刪除 public.users 記錄';
  DELETE FROM users WHERE id = p_user_id;

  -- 3. 刪除 auth.users 記錄
  -- 注意：這需要從 auth.users 表刪除，需要 service_role 權限
  -- 在 Edge Function 中處理
  
  RAISE NOTICE '用戶帳號刪除完成: %', p_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_user_account IS '刪除用戶帳號（永久刪除），符合 Apple App Store 要求。如果用戶是團隊唯一 owner，將自動刪除該團隊。';

-- ═══════════════════════════════════════════════════════════════════
-- 完成訊息
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ 帳號刪除功能已建立！';
  RAISE NOTICE '✅ 已建立函數：';
  RAISE NOTICE '  - delete_user_account(user_id) - 永久刪除用戶帳號';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  注意：刪除為永久性操作，無法復原！';
  RAISE NOTICE '⚠️  符合 Apple App Store Guidelines 5.1.1(v)';
END $$;

