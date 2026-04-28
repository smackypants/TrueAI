/**
 * Barrel for the native capabilities layer. Import from here in app code
 * so individual modules can be reorganised without churning call sites.
 */

export { isNative, isAndroid, isIOS, getPlatform, isPluginAvailable } from './platform'
export { secureStorage } from './secure-storage'
export {
  getNetworkStatus,
  getNetworkStatusSync,
  isOffline,
  onNetworkStatusChange,
  type NetworkStatus,
} from './network'
export { copyText, readText } from './clipboard'
export { share, canShare, type ShareOptions } from './share'
export { haptics } from './haptics'
export { pushBackHandler, onAppResume, initAppLifecycle } from './app-lifecycle'
export { notify, type NotifyOptions } from './notifications'
export { saveTextFile, type SaveTextFileResult } from './filesystem'
export {
  getInstallerSource,
  isInstalledFromFDroid,
  classifyInstallerPackage,
  type InstallerSource,
} from './installer'
export { installNativeIntegrations } from './install'
