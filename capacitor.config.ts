import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cbtexammaster.app',
  appName: 'CBT Exam Master 2026',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'accounts.google.com',
      '*.google.com',
      '*.googleapis.com',
      '*.googleusercontent.com',
      '*.gstatic.com',
    ],
  },
};

export default config;
