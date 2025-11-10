module.exports = {
  expo: {
    name: "OFlow",
    slug: "mobile",
    version: "1.0.2",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "oflow",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.oflow.app",
      buildNumber: "13",
      associatedDomains: ["applinks:oflow-website.vercel.app"],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      versionCode: 11,
      adaptiveIcon: {
        backgroundColor: "#00C300",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.oflow.app",
    },
    plugins: [
      "expo-router",
      "expo-apple-authentication",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "cover",
          backgroundColor: "#00C300",
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
    },
    owner: "alexanderko",
    updates: {
      url: "https://u.expo.dev/0d0c2fcb-f6e8-4a91-8e50-7daff97ee666",
      // 設為 0：強制等待更新檢查完成，不使用緩存
      // 這確保 App 總是能獲取最新的更新 manifest
      fallbackToCacheTimeout: 0,
      // 啟動時自動檢查更新
      checkAutomatically: "ON_LOAD",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
  },
};
