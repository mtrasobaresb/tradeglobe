import {TradeRoute, GlobeInstance, FlowArc, FlowParticle} from './types';
import {GlobeCompliantCurve} from './curves'; // Assuming our Bezier logic is cleanly decoupled
import {CONFIG} from './config';
import * as THREE from 'three';

/**
 * Calculates a beautifully proportioned dynamic control point for a 3D arc
 * @param start 3D Vector of the start city on the globe surface
 * @param end 3D Vector of the end city on the globe surface
 * @param altitudeFactor Tweaks the height profile (0.5 to 0.7 is usually the sweet spot)
 */
export function calculateArcControlPoint(
  start: THREE.Vector3,
  end: THREE.Vector3,
  altitudeFactor = 0.55,
): THREE.Vector3 {
  // Calculate the straight-line Euclidean distance between the two points.
  const distance = start.distanceTo(end);

  // Find the linear midpoint cutting through the inside of the sphere.
  const midPoint = new THREE.Vector3()
    .addVectors(start, end)
    .multiplyScalar(0.5);
  const chordLength = midPoint.length();

  // Normalize the midpoint to get a vector pointing straight up from the earth's core.
  const upDirection = midPoint.clone().normalize();

  // Apply the ArmsGlobe scaling formula.
  const targetLength = chordLength + distance * altitudeFactor;

  // Scale the vector out to its final outer-space altitude coordinate.
  return upDirection.multiplyScalar(targetLength);
}

export function initializePool(
  routes: TradeRoute[],
  world: GlobeInstance,
): FlowParticle[] {
  const flatParticlePool: FlowParticle[] = [];
  const TOTAL_FLIGHT_FRAMES = CONFIG.TARGET_FPS * CONFIG.PARTICLE_LIFETIME; // 3 seconds at 60 FPS
  const uniformSpeed = 1 / TOTAL_FLIGHT_FRAMES;

  routes.forEach((route, routeIndex) => {
    // const arcAlt = route.volume > 800 ? 0.4 : 0.25;
    const arcAlt = route.altitude; // Use the pre-calculated altitude from the route data.

    // 1. Create the shared Arc context exactly ONCE per route
    const sharedArc: FlowArc = {
      route,
      curve: new GlobeCompliantCurve(route, world, arcAlt),
      speed: uniformSpeed,
      size: 0.1, //0.5 + Math.sqrt(route.volume) * 0.02,
    };

    // Arms Globe spacing math
    const particleCount = Math.max(
      2,
      Math.floor(Math.sqrt(route.volume) * 0.25) / 100,
    );
    console.log(
      `Route ${route.id} has volume ${route.volume}, spawning ${particleCount} particles.`,
    );

    // 2. Spawn lightweight tracking nodes pointing to that single parent context
    for (let i = 0; i < particleCount; i++) {
      flatParticlePool.push({
        id: `p_${routeIndex}_${i}`,
        arc: sharedArc, // Passed by reference, zero overhead!
        t: i / particleCount,
      });
    }
  });

  return flatParticlePool;
}

export function tickPool(pool: FlowParticle[], delta: number): void {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];

    // Scale your frame-based speed by actual elapsed time relative to a 60 FPS baseline
    p.t = (p.t + p.arc.speed * (delta * CONFIG.TARGET_FPS)) % 1.0;
  }
}
