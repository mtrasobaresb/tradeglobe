// import Globe from 'globe.gl';
// import * as THREE from 'three';
// import {GlobeInstance, TradeRoute, ActiveFlowElement} from './types';
// import {
//   initializeTradeStreams,
//   updateParticleStreams,
//   activeFlowElements,
//   getGlowingGasMaterial,
//   smallSphereGeo,
//   largeSphereGeo,
// } from './route-flow-engine';

// const clock = new THREE.Clock();

// export function initGlobe(container: HTMLElement, routes: TradeRoute[]) {
//   // 1. Instantiate the globe and bind the structural static background arcs
//   const globe = new Globe(container)
//     .backgroundColor('#05050a')
//     .showAtmosphere(false)

//     // --- RESTORED: STATIC DATA HIGHWAYS ---
//     .arcsData(routes)
//     .arcStartLat((d: object) => (d as TradeRoute).startLat)
//     .arcStartLng((d: object) => (d as TradeRoute).startLng)
//     .arcEndLat((d: object) => (d as TradeRoute).endLat)
//     .arcEndLng((d: object) => (d as TradeRoute).endLng)
//     .arcColor((d: object) => (d as TradeRoute).color)
//     .arcStroke(0.2);

//   // 2. Configure analytical interaction controls
//   const controls = globe.controls();
//   if (controls) {
//     controls.autoRotate = false;
//     controls.enableDamping = true;
//     controls.dampingFactor = 0.05;
//   }

//   // 3. Dynamic custom object layer for streaming neon nodes
//   globe
//     .customLayerData([])
//     .customThreeObject((d: unknown) => {
//       const element = d as ActiveFlowElement;
//       const geometry = element.isLarge ? largeSphereGeo : smallSphereGeo;

//       return new THREE.Mesh(geometry, getGlowingGasMaterial(element.sector));
//     })
//     .customThreeObjectUpdate((obj: unknown, d: unknown) => {
//       const element = d as ActiveFlowElement;
//       const mesh = obj as THREE.Mesh;

//       if (element.curve && mesh) {
//         // Line up the mesh location exactly with the path's t-progress coordinate
//         element.curve.getPoint(element.t, mesh.position);
//       }
//     });

//   // 4. Inject minimalist vector boundary outlines asynchronously
//   fetch(
//     'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson',
//   )
//     .then(res => res.json())
//     .then((data: unknown) => {
//       const geoData = data as {features: object[]};
//       globe
//         .polygonsData(geoData.features)
//         .polygonCapColor(() => 'rgba(21, 32, 54, 0.4)')
//         .polygonStrokeColor(() => 'rgba(255, 255, 255, 0.15)')
//         .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
//         .polygonAltitude(0.002);
//     })
//     .catch(err => {
//       console.error('Failed to stream abstract map vectors:', err);
//     });

//   // 5. Fire up the timing interval generators
//   initializeTradeStreams(routes);

//   const world = globe as GlobeInstance;

//   // 6. Master Application Animation Ticker Loop
//   (function animate() {
//     const deltaMs = clock.getDelta() * 1000;

//     // Advance math values inside route-flow-engine
//     updateParticleStreams(deltaMs, world);

//     // Blast the updated positioning array out to Globe.gl's reactive state engine
//     globe.customLayerData([...activeFlowElements]);

//     requestAnimationFrame(animate);
//   })();

//   return globe;
// }

import * as THREE from 'three';
import Globe from 'globe.gl';
import {geoDistance, geoInterpolate} from 'd3-geo';
import {dummyTrades} from './data-processor';
import {TradeRoute, GlobeInstance} from './types';

// Native tracker structure bypassing the globe's data layer overhead
interface ActiveParticle {
  id: string;
  mesh: THREE.Mesh;
  curve: THREE.QuadraticBezierCurve3;
  t: number;
  speed: number;
}

export function initGlobeEngine(container: HTMLElement): void {
  const activeParticles: ActiveParticle[] = [];

  // --- 1. Global Resource Cache (Prevents GC Thrashing) ---
  const largeSphereGeo = new THREE.SphereGeometry(1.5, 16, 16);
  const smallSphereGeo = new THREE.SphereGeometry(0.9, 16, 16);
  const materialCache: {[key: string]: THREE.MeshBasicMaterial} = {};

  function getSharedMaterial(color: string): THREE.MeshBasicMaterial {
    if (!materialCache[color]) {
      materialCache[color] = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending, // Overlapping spheres amplify brilliance
      });
    }
    return materialCache[color];
  }

  // --- 2. Initialize Core Globe ---
  const world = new Globe(container)
    .backgroundColor('#05050a')
    .showAtmosphere(false);

  const controls = world.controls();
  if (controls) {
    controls.autoRotate = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
  }

  // Inject country outlines
  fetch(
    'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson',
  )
    .then(res => res.json())
    .then((countries: {features: object[]}) => {
      world
        .polygonsData(countries.features)
        .polygonCapColor(() => 'rgba(21, 32, 54, 0.4)')
        .polygonStrokeColor(() => 'rgba(0, 0, 0, 0.15)')
        .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
        .polygonAltitude(0.002);
    })
    .catch(err => console.error('Failed to stream maps:', err));

  // --- 3. Setup Static Arc Tracks ---
  world
    .arcsData(dummyTrades)
    .arcStartLat('startLat')
    .arcStartLng('startLng')
    .arcEndLat('endLat')
    .arcEndLng('endLng')
    .arcColor('color')
    .arcDashLength(0)
    .arcStroke(0.3)
    .arcAltitude((d: object) => {
      const route = d as TradeRoute;
      return route.volume > 800 ? 0.4 : 0.25;
    });

  class GlobeCompliantCurve extends THREE.QuadraticBezierCurve3 {
    private cubicCurve: THREE.CubicBezierCurve3;

    constructor(route: TradeRoute, world: GlobeInstance, arcAlt: number) {
      const dummy = new THREE.Vector3();
      super(dummy, dummy, dummy);

      const startPnt: [number, number] = [route.startLng, route.startLat];
      const endPnt: [number, number] = [route.endLng, route.endLat];

      const startAlt = 0;
      const endAlt = 0;
      const altAutoScale = 0.5;

      let altitude = arcAlt;
      if (altitude === null || altitude === undefined) {
        altitude =
          (geoDistance(startPnt, endPnt) / 2) * altAutoScale +
          Math.max(startAlt, endAlt);
      }

      const getVec = (lng: number, lat: number, alt: number) => {
        const coords = world.getCoords(lat, lng, alt);
        return new THREE.Vector3(coords.x, coords.y, coords.z);
      };

      const interpolate = geoInterpolate(startPnt, endPnt);
      const calcAltCp = (a0: number, a1: number) =>
        a1 + (a1 - a0) * (a0 < a1 ? 0.5 : 0.25);

      // 3. Destructure the tuple cleanly so TS knows exact item counts
      // instead of guessing array structures via spread operators
      const p1 = interpolate(0.25);
      const p2 = interpolate(0.75);

      const m1Alt = calcAltCp(startAlt, altitude);
      const m2Alt = calcAltCp(endAlt, altitude);

      this.cubicCurve = new THREE.CubicBezierCurve3(
        getVec(route.startLng, route.startLat, startAlt),
        getVec(p1[0], p1[1], m1Alt),
        getVec(p2[0], p2[1], m2Alt),
        getVec(route.endLng, route.endLat, endAlt),
      );
    }

    override getPoint(
      t: number,
      target: THREE.Vector3 = new THREE.Vector3(),
    ): THREE.Vector3 {
      return this.cubicCurve.getPoint(t, target);
    }
  }

  // --- 4. High-Performance Particle Factory ---
  function spawnParticle(route: TradeRoute) {
    // Determine the exact altitude property being passed to globe.gl
    const arcAlt = route.volume > 800 ? 0.4 : 0.25;

    // Instantiate our pixel-perfect matched curve tracking wrapper
    const curve = new GlobeCompliantCurve(route, world, arcAlt);

    // Grab cached elements
    const geometry = route.volume > 800 ? largeSphereGeo : smallSphereGeo;
    const material = getSharedMaterial(route.color);
    const mesh = new THREE.Mesh(geometry, material);

    // Add directly to the raw WebGL scene graph
    world.scene().add(mesh);

    // Enforce uniform screen velocity relative to track length
    const startCoords = world.getCoords(route.startLat, route.startLng, 0);
    const endCoords = world.getCoords(route.endLat, route.endLng, 0);
    const distance = new THREE.Vector3(
      startCoords.x,
      startCoords.y,
      startCoords.z,
    ).distanceTo(new THREE.Vector3(endCoords.x, endCoords.y, endCoords.z));

    const baseSpeed = 0.45;
    const computedSpeed = baseSpeed / (distance || 1);

    activeParticles.push({
      id: Math.random().toString(36).substring(2, 9),
      mesh,
      curve, // Linter remains happy, but evaluates the exact cubic math!
      t: 0,
      speed: computedSpeed,
    });
  }

  // --- 5. Optimized Simulation Loop ---
  function tick() {
    // A. Probabilistic Spawn Engine
    dummyTrades.forEach(route => {
      const spawnProbability = route.volume / 40000;
      if (Math.random() < spawnProbability) {
        spawnParticle(route);
      }
    });

    // B. Matrix Update Loop (Updates coordinates natively without array diffing)
    for (let i = activeParticles.length - 1; i >= 0; i--) {
      const p = activeParticles[i];
      p.t += p.speed;

      if (p.t >= 1.0) {
        // Safe Cleanup: Drop from the WebGL rendering tree immediately
        world.scene().remove(p.mesh);
        activeParticles.splice(i, 1);
      } else {
        // Stream location updates straight onto the position vector
        p.curve.getPoint(p.t, p.mesh.position);
      }
    }

    requestAnimationFrame(tick);
  }

  // Kick off engine
  tick();

  window.addEventListener('resize', () => {
    world.width(window.innerWidth).height(window.innerHeight);
  });
}
