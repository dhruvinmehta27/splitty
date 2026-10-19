import type { ConfigContext, ExpoConfig } from 'expo/config';

// GitHub Pages serves the site under /splitty; Vercel and local dev serve it at the root.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL ?? '' },
});
