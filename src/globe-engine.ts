import Globe from 'globe.gl';
import * as THREE from 'three';
import {TradeRoute, GlobeInstance, FlowParticle} from './types';
import {initializePool, tickPool} from './route-flow-engine';

export function initGlobeEngine(
  container: HTMLElement,
  routes: TradeRoute[],
): void {
  // --- Initialize Core Globe Layout ---
  const globe = new Globe(container)
    .backgroundColor('#05050a')
    .showAtmosphere(false);

  const controls = globe.controls();
  if (controls) {
    controls.autoRotate = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
  }

  // Static structural background paths
  globe
    .arcsData(routes)
    .arcStartLat('startLat')
    .arcStartLng('startLng')
    .arcEndLat('endLat')
    .arcEndLng('endLng')
    .arcColor('color')
    .arcDashLength(0)
    .arcStroke(0.3)
    .arcAltitude((d: object) => ((d as TradeRoute).volume > 800 ? 0.4 : 0.25));

  // Country vector boundaries
  fetch(
    'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson',
  )
    .then(res => res.json())
    .then((countries: {features: object[]}) => {
      globe
        .polygonsData(countries.features)
        .polygonCapColor(() => 'rgba(21, 32, 54, 0.4)')
        .polygonStrokeColor(() => 'rgba(0, 0, 0, 0.15)')
        .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
        .polygonAltitude(0.002);
    })
    .catch(err => console.error('Failed to stream maps:', err));

  const world = globe as unknown as GlobeInstance;

  // --- Global Asset Cache ---
  // --- 1. Helper to build a glowing texture programmatically ---
  // function createGlowTexture(colorStr: string): THREE.Texture {
  //   const canvas = document.createElement('canvas');
  //   canvas.width = 64;
  //   canvas.height = 64;
  //   const ctx = canvas.getContext('2d');

  //   if (ctx) {
  //     const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  //     // A white-hot center makes the particle look genuinely emissive
  //     gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  //     // Transition out to the route's specific trade color
  //     gradient.addColorStop(0.2, colorStr);
  //     // Fade out completely to absolute transparent black at the edges
  //     gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  //     ctx.fillStyle = gradient;
  //     ctx.fillRect(0, 0, 64, 64);
  //   }

  //   const texture = new THREE.CanvasTexture(canvas);
  //   return texture;
  // }

  // function createGlowTexture(colorStr: string): THREE.Texture {
  //   const canvas = document.createElement('canvas');
  //   canvas.width = 64;
  //   canvas.height = 64;
  //   const ctx = canvas.getContext('2d');

  //   if (ctx) {
  //     // --- Step 1: Shape the Non-Linear Transparency Mask ---
  //     const maskGradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);

  //     // Instead of linear, we pack the opacity heavily at the start
  //     // to simulate a natural inverse-square light decay
  //     maskGradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)'); // Blinding center
  //     maskGradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.95)'); // Sustained high brightness
  //     maskGradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.75)'); // Structural color mass
  //     maskGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.35)'); // Sharp drop-off begins
  //     maskGradient.addColorStop(0.9, 'rgba(255, 255, 255, 0.08)'); // Ambient trailing edge
  //     maskGradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)'); // Clean boundary

  //     ctx.fillStyle = maskGradient;
  //     ctx.fillRect(0, 0, 64, 64);

  //     // --- Step 2: Tint the Mask with the Custom Trade Color ---
  //     // 'source-in' tells the canvas: "Only keep the pixels we already drew,
  //     // but overwrite their color completely with this new fillStyle."
  //     ctx.globalCompositeOperation = 'source-in';
  //     ctx.fillStyle = colorStr;
  //     ctx.fillRect(0, 0, 64, 64);

  //     // --- Step 3: Inject the High-Intensity White Core ---
  //     // Switch back to normal drawing to layer a white-hot center on top
  //     ctx.globalCompositeOperation = 'source-over';
  //     const coreGradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 12); // Tighter radius
  //     coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  //     coreGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
  //     coreGradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  //     ctx.fillStyle = coreGradient;
  //     ctx.fillRect(0, 0, 64, 64);
  //   }

  //   const texture = new THREE.CanvasTexture(canvas);
  //   // Optional enhancement: Keep the texture crisp when rendered small
  //   texture.minFilter = THREE.LinearFilter;
  //   return texture;
  // }

  //   // --- 2. Global Sprite Material Cache ---
  // const materialCache: {[key: string]: THREE.SpriteMaterial} = {};

  // function getSharedSpriteMaterial(color: string): THREE.SpriteMaterial {
  //   if (!materialCache[color]) {
  //     materialCache[color] = new THREE.SpriteMaterial({
  //       map: createGlowTexture(color),
  //       transparent: true,
  //       blending: THREE.AdditiveBlending, // Colors mathematically add together when overlapping
  //       depthWrite: false, // CRITICAL: Prevents transparent boxes from clipping particles behind them
  //     });
  //   }
  //   return materialCache[color];
  // }

  let cachedMasterTexture: THREE.Texture | null = null;
  function getMasterGlowTexture(): THREE.Texture {
    if (cachedMasterTexture) return cachedMasterTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 128; // Higher resolution for crisp highlights
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);

      // Mimicking a professional pre-rendered flare:
      // Pure blinding white core, holding high intensity, then dropping off sharply
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)'); // Blinding center highlight
      gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.95)');
      gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.85)'); // Tight core profile
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)'); // Rapid falloff for crispness
      gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.08)'); // Soft ambient outer ring
      gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0)'); // Hard cutoff

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }

    cachedMasterTexture = new THREE.CanvasTexture(canvas);
    cachedMasterTexture.minFilter = THREE.LinearFilter;
    return cachedMasterTexture;
  }

  // --- 2. Global Sprite Material Cache (Leveraging Native Tinting) ---
  const materialCache: {[key: string]: THREE.SpriteMaterial} = {};

  function getTintedSpriteMaterial(colorStr: string): THREE.SpriteMaterial {
    if (!materialCache[colorStr]) {
      materialCache[colorStr] = new THREE.SpriteMaterial({
        map: getMasterGlowTexture(), // Everyone shares the exact same master white flare map!
        color: new THREE.Color(colorStr), // <--- Native GPU multiplication tinting happens here!
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
    }
    return materialCache[colorStr];
  }

  const flowParticles = initializePool(routes, world) as FlowParticle[];

  // LEGACY FROM MESHES-BASED IMPLEMENTATION (REPLACED WITH SPRITES)
  // function getSharedMaterial(color: string): THREE.MeshBasicMaterial {
  //   if (!materialCache[color]) {
  //     materialCache[color] = new THREE.MeshBasicMaterial({
  //       color: color,
  //       transparent: true,
  //       opacity: 0.85,
  //       blending: THREE.AdditiveBlending,
  //     });
  //   }
  //   return materialCache[color];
  // }

  // // Instantiating our completely static data vector
  // const flowParticles = initializePool(routes, world) as FlowParticle[];

  // --- Declarative Custom Layer Hook ---
  globe
    .customLayerData(flowParticles) // Bound EXACTLY ONCE here at setup
    .customThreeObject((d: object) => {
      const p = d as FlowParticle;
      const material = getTintedSpriteMaterial(p.arc.route.color);
      const sprite = new THREE.Sprite(material);

      // Sprites scale along X and Y axes.
      // Because textures have a soft fade out, you might want to scale them slightly larger
      // than your old solid spheres (e.g., multiplying by 6 or 8) to make the glow pop.
      const visualSize = p.arc.size * 7;
      sprite.scale.set(visualSize, visualSize, 1);

      // Link it to our array data reference
      p.sprite = sprite;

      // Position it initially
      p.arc.curve.getPoint(p.t, sprite.position);

      return sprite;
    });
  // NOTE: .customThreeObjectUpdate has been completely removed

  // --- Fluid Animation Engine Ticker ---
  function tick() {
    // 1. Advance data parameters in background manager (updates p.t values)
    tickPool(flowParticles);

    // 2. Manually push the updated math to the GPU via direct reference mutability
    for (let i = 0; i < flowParticles.length; i++) {
      const p = flowParticles[i];

      if (p.sprite) {
        // Run your original Bezier curve equation directly into the mesh position vector
        p.arc.curve.getPoint(p.t, p.sprite.position);
      }
    }

    requestAnimationFrame(tick);
  }

  // Kick off engine
  tick();

  window.addEventListener('resize', () => {
    globe.width(window.innerWidth).height(window.innerHeight);
  });
}
