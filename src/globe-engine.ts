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
  const baseSphereGeo = new THREE.SphereGeometry(1, 16, 16);
  const materialCache: {[key: string]: THREE.MeshBasicMaterial} = {};

  function getSharedMaterial(color: string): THREE.MeshBasicMaterial {
    if (!materialCache[color]) {
      materialCache[color] = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
    }
    return materialCache[color];
  }

  // Instantiating our completely static data vector
  const flowParticles = initializePool(routes, world) as FlowParticle[];

  // --- Declarative Custom Layer Hook ---
  globe
    .customLayerData(flowParticles) // Bound EXACTLY ONCE here at setup
    .customThreeObject((d: object) => {
      const p = d as FlowParticle;
      const material = getSharedMaterial(p.arc.route.color);
      const mesh = new THREE.Mesh(baseSphereGeo, material);

      mesh.scale.setScalar(p.arc.size);

      // Store a direct handle to the 3D object on our data reference
      p.mesh = mesh;

      // Initialize its starting position using the Bezier curve math
      p.arc.curve.getPoint(p.t, mesh.position);

      return mesh;
    });
  // NOTE: .customThreeObjectUpdate has been completely removed

  // --- Fluid Animation Engine Ticker ---
  function tick() {
    // 1. Advance data parameters in background manager (updates p.t values)
    tickPool(flowParticles);

    // 2. Manually push the updated math to the GPU via direct reference mutability
    for (let i = 0; i < flowParticles.length; i++) {
      const p = flowParticles[i];

      if (p.mesh) {
        // Run your original Bezier curve equation directly into the mesh position vector
        p.arc.curve.getPoint(p.t, p.mesh.position);
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
