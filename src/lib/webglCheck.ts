export function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl') ||
      (canvas.getContext as any)('experimental-webgl')
    );
  } catch {
    return false;
  }
}
