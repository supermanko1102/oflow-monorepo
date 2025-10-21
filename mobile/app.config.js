module.exports = {
  expo: {
    name: "mobile",
    slug: "mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "oflow",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.oflow.mobile",
      associatedDomains: [
        // TODO: 部署 website 後，將此替換為實際的 Vercel 域名
        // 例如: "applinks:oflow-monorepo.vercel.app"
        "applinks:https://oflow-website.vercel.app",
      ],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.oflow.mobile",
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "0d0c2fcb-f6e8-4a91-8e50-7daff97ee666",
      },
      lineChannelId: process.env.EXPO_PUBLIC_LINE_CHANNEL_ID,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      // LINE Login redirect URI (使用 Universal Link)
      // TODO: 部署 website 後，將此替換為實際的 Vercel 域名
      lineRedirectUri:
        process.env.EXPO_PUBLIC_LINE_REDIRECT_URI ||
        "https://oflow-website.vercel.app/auth/line-callback",
    },
    owner: "alexanderko",
  },
};
