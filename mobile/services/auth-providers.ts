// services/auth-providers.ts
// 使用 Supabase 內建 OAuth Providers 進行登入
// 支援 Google 和 Apple Sign In

import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";

export interface AuthSession {
    access_token: string;
    refresh_token: string;
}

/**
 * Google 登入
 * 使用 Supabase OAuth Provider
 */
export const loginWithGoogle = async (): Promise<void> => {
    try {
        console.log("[Google Auth] 開始 Google Sign In...");

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                // 使用 URL Scheme 作為 redirect（開發階段）
                // iOS 會自動使用 Universal Link（如果已設定）
                redirectTo: Platform.select({
                    ios: "oflow://auth/callback",
                    android: "oflow://auth/callback",
                    default: "oflow://auth/callback",
                }),
                skipBrowserRedirect: false,
                // 請求額外的 scope
                queryParams: {
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        });

        if (error) {
            console.error("[Google Auth] 錯誤:", error);
            throw error;
        }

        console.log("[Google Auth] OAuth 流程已啟動");
        // OAuth 流程會自動處理，不需要手動處理 callback
    } catch (error) {
        console.error("[Google Auth] 登入失敗:", error);
        throw error;
    }
};

/**
 * Apple 登入
 * 使用 Supabase OAuth Provider
 */
export const loginWithApple = async (): Promise<void> => {
    try {
        console.log("[Apple Auth] 開始 Apple Sign In...");

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "apple",
            options: {
                // iOS 使用 Universal Link，Android 使用 URL Scheme
                redirectTo: Platform.select({
                    ios: "https://oflow-website.vercel.app/auth/callback",
                    android: "oflow://auth/callback",
                    default: "oflow://auth/callback",
                }),
                skipBrowserRedirect: false,
                // Apple 需要的 scopes
                scopes: "name email",
            },
        });

        if (error) {
            console.error("[Apple Auth] 錯誤:", error);
            throw error;
        }

        console.log("[Apple Auth] OAuth 流程已啟動");
    } catch (error) {
        console.error("[Apple Auth] 登入失敗:", error);
        throw error;
    }
};

/**
 * 檢查當前登入狀態
 */
export const getCurrentSession = async () => {
    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    if (error) {
        console.error("[Auth] 取得 session 失敗:", error);
        return null;
    }

    return session;
};

/**
 * 登出
 */
export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("[Auth] 登出失敗:", error);
        throw error;
    }
    console.log("[Auth] 登出成功");
};
