import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ── App identity ──────────────────────────────────────────────────────────
  // appId must be a unique reverse-domain identifier. Change this to match
  // your actual domain before publishing to Google Play.
  appId: 'com.focusflow.app',
  appName: 'Focus Flow',

  // ── Web assets ───────────────────────────────────────────────────────────
  // Points Capacitor to the Vite build output directory.
  webDir: 'dist',

  // ── Server config (development only) ────────────────────────────────────
  // Uncomment the block below during local development to enable live-reload
  // from your Vite dev server instead of bundling the web assets.
  //
  // server: {
  //   url: 'http://192.168.1.110:5173/focus-flow/',
  //   cleartext: true,
  // },

  plugins: {
    // ── SplashScreen ────────────────────────────────────────────────────────
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0f172a',   // matches theme_color in vite.config.ts
      showSpinner: false,
    },
  },
};

export default config;
