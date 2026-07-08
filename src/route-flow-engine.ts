import {TradeRoute, GlobeInstance, FlowArc, FlowParticle} from './types';
import {GlobeCompliantCurve} from './curves'; // Assuming our Bezier logic is cleanly decoupled

export function initializePool(
  routes: TradeRoute[],
  world: GlobeInstance,
): FlowParticle[] {
  const flatParticlePool: FlowParticle[] = [];
  const TOTAL_FLIGHT_FRAMES = 180; // 3 seconds at 60 FPS
  const uniformSpeed = 1 / TOTAL_FLIGHT_FRAMES;

  routes.forEach((route, routeIndex) => {
    const arcAlt = route.volume > 800 ? 0.4 : 0.25;

    // 1. Create the shared Arc context exactly ONCE per route
    const sharedArc: FlowArc = {
      route,
      curve: new GlobeCompliantCurve(route, world, arcAlt),
      speed: uniformSpeed,
      size: 0.5 + Math.sqrt(route.volume) * 0.02,
    };

    // Arms Globe spacing math
    const particleCount = Math.max(
      2,
      Math.floor(Math.sqrt(route.volume) * 0.25),
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

export function tickPool(pool: FlowParticle[]): void {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    // Read speed from the shared parent reference, update individual progress variable
    p.t = (p.t + p.arc.speed) % 1.0;
  }
}
