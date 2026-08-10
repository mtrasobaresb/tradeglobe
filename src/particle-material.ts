import * as THREE from 'three';

// --- State Variables (Scoped to this module, isolated from the engine) ---
let cachedMasterTexture: THREE.Texture | null = null;
const materialCache: {[key: string]: THREE.SpriteMaterial} = {};

/**
 * Generates or retrieves a shared high-resolution white flare texture.
 * Built procedurally via HTML5 Canvas to mimic professional particle assets.
 */
function getMasterGlowTexture(): THREE.Texture {
  if (cachedMasterTexture) return cachedMasterTexture;
  const CANVAS_SIZE = 128;
  const GRADIENT_RADIUS = CANVAS_SIZE / 2;

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const gradient = ctx.createRadialGradient(
      GRADIENT_RADIUS,
      GRADIENT_RADIUS,
      0,
      GRADIENT_RADIUS,
      GRADIENT_RADIUS,
      GRADIENT_RADIUS,
    );

    // High-intensity white core falling off sharply for a crisp look
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
    gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.08)');
    gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  cachedMasterTexture = new THREE.CanvasTexture(canvas);
  cachedMasterTexture.minFilter = THREE.LinearFilter;
  return cachedMasterTexture;
}

/**
 * Factory function that manages a cache of tinted materials.
 * Ensures the GPU only keeps one material per color thread, regardless of particle count.
 * @param colorStr Any valid CSS color string (hex, rgb, named color)
 */
export function getTintedSpriteMaterial(
  colorStr: string,
): THREE.SpriteMaterial {
  const normalizedKey = colorStr.toLowerCase().trim();

  if (!materialCache[normalizedKey]) {
    materialCache[normalizedKey] = new THREE.SpriteMaterial({
      map: getMasterGlowTexture(),
      color: new THREE.Color(normalizedKey), // WebGL multiplies this against the grayscale map
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  return materialCache[normalizedKey];
}
