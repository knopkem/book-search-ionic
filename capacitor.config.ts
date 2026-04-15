import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pacsnode.booksearch',
  appName: 'book-search-ionic',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
