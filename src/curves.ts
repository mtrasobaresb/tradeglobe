import * as THREE from 'three';
import {geoDistance, geoInterpolate} from 'd3-geo';
import {TradeRoute, GlobeInstance} from './types';

export class GlobeCompliantCurve extends THREE.QuadraticBezierCurve3 {
  private cubicCurve: THREE.CubicBezierCurve3;

  constructor(route: TradeRoute, world: GlobeInstance, arcAlt?: number) {
    // Call the parent constructor with dummy vectors to satisfy TS/Three.js inheritance
    const dummy = new THREE.Vector3();
    super(dummy, dummy, dummy);

    const startPnt: [number, number] = [route.startLng, route.startLat];
    const endPnt: [number, number] = [route.endLng, route.endLat];

    const startAlt = 0;
    const endAlt = 0;
    const altAutoScale = 0.5;

    // Use provided altitude or fall back to the native auto-scale calculation
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

    // Sample the exact 25% and 75% great-circle control coordinates
    const p1 = interpolate(0.25);
    const p2 = interpolate(0.75);

    const m1Alt = calcAltCp(startAlt, altitude);
    const m2Alt = calcAltCp(endAlt, altitude);

    // Lock down the matching cubic curve instance
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
