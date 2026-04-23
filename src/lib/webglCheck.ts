import { MAPBOX_TOKEN } from './mapbox';

export function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
    return true;
  } catch {
    return false;
  }
}

// More aggressive check: spin up a real Mapbox GL map in a hidden div and
// watch for webglcontextlost. Mali-G57 and similar problem GPUs lose context
// within seconds. Resolves true (WebGL OK) after 2 s without a context loss.
export async function detectWebGLSupport(): Promise<boolean> {
  if (!isWebGLSupported()) return false;

  return new Promise((resolve) => {
    let resolved = false;

    const container = document.createElement('div');
    container.style.cssText =
      'width:1px;height:1px;position:fixed;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;';
    document.body.appendChild(container);

    const cleanup = (result: boolean) => {
      if (resolved) return;
      resolved = true;
      try { document.body.removeChild(container); } catch {}
      resolve(result);
    };

    const timer = setTimeout(() => cleanup(true), 2000);

    import('mapbox-gl').then(({ default: mb }) => {
      try {
        mb.accessToken = MAPBOX_TOKEN;
        const map = new mb.Map({
          container,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [6.13, 45.9],
          zoom: 5,
          maxTileCacheSize: 0,
          fadeDuration: 0,
        });

        map.getCanvas().addEventListener('webglcontextlost', () => {
          clearTimeout(timer);
          try { map.remove(); } catch {}
          cleanup(false);
        });

        map.once('load', () => {
          clearTimeout(timer);
          try { map.remove(); } catch {}
          cleanup(true);
        });

        map.on('error', () => { /* don't fail on tile/network errors */ });
      } catch {
        clearTimeout(timer);
        cleanup(false);
      }
    }).catch(() => {
      clearTimeout(timer);
      cleanup(false);
    });
  });
}
