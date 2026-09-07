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
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  altitude: number;
  type: 'export' | 'import';
  partnerName: string;
  volume: number;
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
  sprite?: THREE.Sprite; // Add this optional property
}

// Country data representation for the globe visualization, including ISO codes and coordinates.
export interface Country {
  name: string;
  iso3: string;
  lat: number;
  lng: number;
}

// List of countries, keyed by a random numerical identifier, for quick access and iteration.
export interface CountriesMap {
  [id: string]: Country;
}

// HS (Harmonized System) trade classification data structure for organizing trade volumes by chapters within sections.
export interface HsChapter {
  id: string;
  name: string;
}

// HS (Harmonized System) trade classification data structures for organizing trade volumes by sections.
export interface HsSection {
  section_id: string;
  section_name: string;
  chapters: HsChapter[];
}

// Data structure for organizing HS (Harmonized System) trade classifications by sections.
export interface HsSectionsData {
  sections: HsSection[];
}

// Aggregated bilateral trade link between two specific countries.
export interface BilateralTrade {
  exporterId: string;
  importerId: string;
  totalVolume: number;
  sectionVolumes: Record<string, number>; // section_id -> volume
  chapterVolumes: Record<string, number>; // chapter_id -> volume
}

// Format expected by globe.gl for arc rendering. IS THIS NEEDED
export interface TradeArc {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  //stroke: number;
  altitude: number;
  type: 'export' | 'import';
  partnerName: string;
  volume: number;
}

export interface CountryFeatureProperties {
  baci_code: number;
  baci_name: string;
  iso3: string;
  gw_code?: number | null;
  geom_source: string;
  start_year: number;
  end_year: number;
  center_lon: number;
  center_lat: number;
  alt_names?: {
    formal_en?: string;
    name_long?: string;
  };
}

export interface CountryFeature {
  type: 'Feature';
  properties: CountryFeatureProperties;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface CountryGeoJson {
  type: 'FeatureCollection';
  features: CountryFeature[];
}
