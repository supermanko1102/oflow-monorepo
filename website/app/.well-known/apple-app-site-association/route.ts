import { NextResponse } from "next/server";

/**
 * Apple App Site Association (AASA) 文件
 * 用於 iOS Universal Links
 *
 * 必須在 https://yourdomain.com/.well-known/apple-app-site-association 可訪問
 * 且 Content-Type 必須是 application/json
 */
export async function GET() {
  const aasa = {
    applinks: {
      apps: [],
      details: [
        {
          appID: "NK45C26RDB.com.oflow.app",
          paths: ["/auth/callback"],
        },
      ],
    },
  };

  return NextResponse.json(aasa, {
    headers: {
      "Content-Type": "application/json",
      // CDN 緩存 24 小時
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
