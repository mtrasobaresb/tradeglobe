import * as THREE from 'three';
import {geoDistance, geoInterpolate} from 'd3-geo';
import {TradeRoute, GlobeInstance, ActiveParticle} from './types';

// --- Local Memory Cache (Keeps your GPU screaming fast) ---
const activeParticles: ActiveParticle[] = [];
const largeSphereGeo = new THREE.SphereGeometry(1.5, 16, 16);
const smallSphereGeo = new THREE.SphereGeometry(0.9, 16, 16);
const materialCache: {[key: string]: THREE.MeshBasicMaterial} = {};

function getSharedMaterial(color: string): THREE.MeshBasicMaterial {
  if (!materialCache[color]) {
    materialCache[color] = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
  }
  return materialCache[color];
}

// --- Your Original Bezier Math Wrapper ---
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

// --- Imperative Spawner Mechanism ---
function spawnParticle(route: TradeRoute, world: GlobeInstance) {
  const arcAlt = route.volume > 800 ? 0.4 : 0.25;
  const curve = new GlobeCompliantCurve(route, world, arcAlt);

  const geometry = route.volume > 800 ? largeSphereGeo : smallSphereGeo;
  const material = getSharedMaterial(route.color);
  const mesh = new THREE.Mesh(geometry, material);

  // Directly inject into Three.js scene graph bypasses framework delays
  world.scene().add(mesh);

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
    curve,
    t: 0,
    speed: computedSpeed,
  });
}

// --- Single Export to Drive the Tick Frame ---
export function tickSimulation(routes: TradeRoute[], world: GlobeInstance) {
  // A. Probabilistic Spawn Engine
  routes.forEach(route => {
    const sampleRoll = route.volume / 40000;
    if (Math.random() < sampleRoll) {
      spawnParticle(route, world);
    }
  });

  // B. Native Array Mutation Pipeline
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i];
    p.t += p.speed;

    if (p.t >= 1.0) {
      world.scene().remove(p.mesh);
      activeParticles.splice(i, 1);
    } else {
      p.curve.getPoint(p.t, p.mesh.position);
    }
  }
}
