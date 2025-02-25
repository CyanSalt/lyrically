export function checkVibrancySupport() {
  return worldBridge.platform === 'darwin' && !worldBridge.isNotchWindow
}
