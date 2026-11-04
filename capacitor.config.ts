import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.zhuanght1201.buaatimetablesign',
  appName: 'BUAA Timetable & Sign-in',
  webDir: 'dist',
  backgroundColor: '#f3f5f0',
  android: {
    allowMixedContent: true,
    backgroundColor: '#f3f5f0',
  },
};

export default config;
