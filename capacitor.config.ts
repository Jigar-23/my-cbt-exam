import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cbtexammaster.app',
  appName: 'CBT Exam Master 2026',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
