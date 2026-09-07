import Globe from 'globe.gl';
import * as THREE from 'three';
import {TradeRoute, GlobeInstance, FlowParticle, CountryFeature} from './types';
import {getTextureForYear, preloadTextures} from './texture-manager';
import {initializePool, tickPool} from './route-flow-engine';
import {getTintedSpriteMaterial} from './particle-material';
import {CONFIG} from './config';

// Main entry point for the globe visualization engine.
export interface GlobeEngineAPI {
  updateYear: (year: number) => void;
  updateRoutes: (newRoutes: TradeRoute[]) => void;
  updatePolygons: (newPolygons: CountryFeature[]) => void;
  destroy: () => void;
}

// Initializes the globe engine and returns an API for updating routes and destroying the globe.
export function initGlobeEngine(
  container: HTMLElement,
  initialRoutes: TradeRoute[] = [],
  activePolygons: CountryFeature[] = [],
  initialYear: number = 2024,
): GlobeEngineAPI {
  // Pre-cache all epoch textures immediately upon startup
  preloadTextures();

  // Resolve initial texture path for the requested year
  let currentTexturePath = getTextureForYear(initialYear);
  // Initialize Core Globe Layout.
  const globe = new Globe(container)
    .globeImageUrl(currentTexturePath)
    .backgroundColor('#05050a')
    .showAtmosphere(false);

  // Configure camera controls for user interaction.
  const controls = globe.controls();
  if (controls) {
    controls.autoRotate = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 125; // Distance 100 = Surface. 125 = ~0.25 altitude above surface (prevents pixelation).
    controls.maxDistance = 500; // Prevents zooming out so far that the globe shrinks to a dot.
  }

  // Static structural background paths.
  globe
    .arcsData(initialRoutes)
    .arcStartLat('startLat')
    .arcStartLng('startLng')
    .arcEndLat('endLat')
    .arcEndLng('endLng')
    .arcColor('color')
    .arcDashLength(0)
    .arcStroke(CONFIG.ARC_STROKE)
    .arcAltitude('altitude');

  // Country vector boundaries configured with initial activePolygons
  // Helper to filter out null or invalid GeoJSON features
  // const validPolygons = (activePolygons || []).filter(
  //   f => f && (f.geometry || f.type),
  // );

  // globe
  //   .polygonsData(validPolygons)
  //   .polygonCapColor(() => 'rgba(21, 32, 54, 0.4)')
  //   .polygonStrokeColor(() => 'rgba(255, 255, 255, 0.2)')
  //   .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
  //   .polygonAltitude(0.01);

  const world = globe as unknown as GlobeInstance;

  // Dynamic Engine State.
  let currentRoutes = initialRoutes;
  let flowParticles: FlowParticle[] = [];

  // Helper to sync Arcs & Particles with Three.js.
  function syncEngineData(routes: TradeRoute[]) {
    currentRoutes = routes;

    // Update static 3D arcs on globe.gl.
    globe
      .arcsData(currentRoutes)
      .arcStartLat('startLat')
      .arcStartLng('startLng')
      .arcEndLat('endLat')
      .arcEndLng('endLng')
      .arcColor('color')
      .arcDashLength(0)
      //.arcStroke((d: object) => (d as TradeRoute).stroke ?? 0.3)
      .arcStroke(CONFIG.ARC_STROKE)
      .arcAltitude('altitude');

    // Re-initialize particle animation pool.
    flowParticles = initializePool(currentRoutes, world) as FlowParticle[];

    // Re-bind custom layer to the new particle pool.
    globe.customLayerData(flowParticles).customThreeObject((d: object) => {
      const p = d as FlowParticle;
      const material = getTintedSpriteMaterial(p.arc.route.color);
      const sprite = new THREE.Sprite(material);

      const visualSize = p.arc.size * CONFIG.BASE_SIZE_MULTIPLIER;
      sprite.scale.set(visualSize, visualSize, 1);

      p.sprite = sprite;
      p.arc.curve.getPoint(p.t, sprite.position);

      return sprite;
    });
  }

  // Initial sync with initial routes.
  syncEngineData(initialRoutes);

  // Animation Engine Ticker.
  const timer = new THREE.Timer();
  timer.connect(document);

  // Helper function to handle the animation loop and update particle positions.
  function tick() {
    timer.update(); // Take a snapshot of the current frame time, getDelta() is now safe to call.
    const delta = timer.getDelta();

    // Advance the true underlying data progress (runs fully from 0.0 to 1.0).
    tickPool(flowParticles, delta);

    for (let i = 0; i < flowParticles.length; i++) {
      const p = flowParticles[i];

      if (p.sprite) {
        // Clamp the visual rendering t-value slightly (e.g., between 0.005 and 0.995)
        // This ensures the sprite is always slightly airborne, keeping its geometry
        // clean off the absolute flat crust of the globe.
        // const warpedT = p.t * p.t * (3 - 2 * p.t);
        // const visualT = Math.max(0.005, Math.min(0.995, p.t));
        const visualT = p.t;
        p.arc.curve.getPoint(visualT, p.sprite.position);

        // Calculate Edge Scaling based on the true progress data
        let edgeScale = 1.0;

        if (p.t < CONFIG.EDGE_FADE_THRESHOLD) {
          // Smoothly scale up from 0.25 to 1 at launch
          edgeScale = 0.25 + 0.75 * (p.t / CONFIG.EDGE_FADE_THRESHOLD);
          // edgeScale = (p.t / CONFIG.EDGE_FADE_THRESHOLD);
        } else if (p.t > 1.0 - CONFIG.EDGE_FADE_THRESHOLD) {
          // Smoothly scale down from 1 to 0.25 at touchdown
          edgeScale = 0.25 + 0.75 * ((1.0 - p.t) / CONFIG.EDGE_FADE_THRESHOLD);
          // edgeScale = ((1.0 - p.t) / CONFIG.EDGE_FADE_THRESHOLD);
        }

        // Optional: Apply a smooth quadratic curve to the scale so it shrinks
        // even faster right as it approaches the ground
        const easedScale = edgeScale * edgeScale;

        // 4. Update the GPU sprite transformations
        const calculatedSize =
          p.arc.size * CONFIG.BASE_SIZE_MULTIPLIER * easedScale;
        p.sprite.scale.set(calculatedSize, calculatedSize, 1);
      }
    }

    requestAnimationFrame(tick);
  }

  // Kick off engine.
  tick();

  // Handle responsive resizing cleanly.
  const handleResize = () => {
    globe.width(window.innerWidth).height(window.innerHeight);
  };
  window.addEventListener('resize', handleResize);

  // Return the API for external control of the globe engine.
  return {
    updateYear: (year: number) => {
      const targetTexture = getTextureForYear(year);
      // Only swap WebGL texture if we crossed an epoch boundary.
      if (targetTexture !== currentTexturePath) {
        currentTexturePath = targetTexture;
        globe.globeImageUrl(targetTexture);
      }
    },
    updateRoutes: (newRoutes: TradeRoute[]) => {
      syncEngineData(newRoutes);
    },
    updatePolygons: (newPolygons: CountryFeature[]) => {
      const clean = (newPolygons || []).filter(
        f => f && (f.geometry || f.type),
      );
      globe.polygonsData(clean);
    },
    destroy: () => {
      window.removeEventListener('resize', handleResize);
      timer.dispose(); // Unhooks the DOM page visibility listeners.
      globe.renderer().dispose(); // Frees up GPU WebGL buffers.
    },
  };
}
