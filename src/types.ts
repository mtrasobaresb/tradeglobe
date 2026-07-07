import * as THREE from 'three';

// The blueprint for a raw trade route from your data set
export interface TradeRoute {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  type: string;
  volume: number;
}

// The blueprint for an active glowing particle flying through the sky
export interface TradeParticle {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  type: string;
  volume: number;
  t: number; // Timeline progress: 0.0 to 1.0
  speed: number; // Velocity step per frame
  maxAlt: number; // Peak arc height
  startVec: THREE.Vector3; // Pre-calculated start vector
  endVec: THREE.Vector3; // Pre-calculated end vector
}

export interface GlobeInstance {
  getCoords: (
    lat: number,
    lng: number,
    alt?: number,
  ) => {x: number; y: number; z: number};
  scene: () => THREE.Scene;
}

export interface ActiveParticle {
  id: string;
  mesh: THREE.Mesh;
  curve: THREE.QuadraticBezierCurve3;
  t: number;
  speed: number;
}
