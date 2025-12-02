import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const env = {
    lineChannelId: process.env.EXPO_PUBLIC_LINE_CHANNEL_ID,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };

  return {
    ...config,
    name: config.name!,
    slug: config.slug!,
    extra: {
      ...config.extra,
      ...env,
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#5A6B7C",
          image: "./assets/images/splash-icon.png",
          resizeMode: "cover",
        },
      ],
      ["expo-build-properties", { ios: { useFrameworks: "static" } }],
      "@xmartlabs/react-native-line",
    ],
  };
};
