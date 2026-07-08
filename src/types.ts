import * as THREE from 'three';
import {GlobeCompliantCurve} from './curves';

export interface GlobeInstance {
  getCoords: (
    lat: number,
    lng: number,
    alt?: number,
  ) => {x: number; y: number; z: number};
  scene: () => THREE.Scene;
}

// Single trade route's data representation.
export interface TradeRoute {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  volume: number;
  sector: string;
  color: string;
}

// Shared contract for a single trade route's visual representation in the 3D scene.
export interface FlowArc {
  route: TradeRoute;
  curve: GlobeCompliantCurve; // Reusable Bezier curve instance for this route
  speed: number;
  size: number;
}

// Pool particle representation for a single reusable particle that flows along a trade route's arc.
export interface FlowParticle {
  id: string;
  arc: FlowArc; // Memory pointer to the shared parent blueprint.
  t: number; // Particle's current timeline progress along the arc: 0.0 to 1.0
  mesh?: THREE.Mesh; // Add this optional property
}
