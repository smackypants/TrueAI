import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trueai.localai',
  appName: 'TrueAI LocalAI',
  webDir: 'dist',
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK'
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1d24',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      // App will call SplashScreen.hide() once React has mounted (see
      // src/lib/native/install.ts) so we keep autoHide off for accuracy.
      launchAutoHide: false,
    },
    StatusBar: {
      // Match the dark theme background defined in main.css.
      backgroundColor: '#1a1d24',
      style: 'DARK',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#1a1d24',
    },
  },
}

export default config;
