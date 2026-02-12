export interface GeoMetadata {
  id: string; // Unique identifier for precise selection
  geocode: string; // New: Standardized Geocode (e.g., KA-T-01)
  name: string;
  type: 'District' | 'Taluk' | 'Village' | 'Pincode';
  district?: string; // New: Parent District
  taluk?: string;    // New: Parent Taluk (for Villages)
  population?: number; // Optional
  literacyRate?: number; // Optional
  areaSqKm?: number; // Optional
  nearestCity?: string; // Optional
  distanceToCityKm?: number; // Optional
  nearestRailway?: string; // Optional
  distanceToRailwayKm?: number; // Optional
  nearestAirport?: string; // Optional
  distanceToAirportKm?: number; // Optional
  description?: string;

  // --- New Layer-Specific Fields ---
  sexRatio?: number; // Females per 1000 males (District/Taluk)
  mainCrops?: string[]; // Agriculture (Taluk/Village)
  keyMarkets?: string[]; // Urban Commerce (Pincode/Taluk) - NEW
  numVillages?: number; // Admin (Taluk)
  numTaluks?: number; // Admin (District)
  hospitalCount?: number; // Infra (Taluk)
  schoolCount?: number; // Infra (Taluk/Village)
  waterSource?: string; // Village Infra
  roadCondition?: string; // Village Infra
  busFrequency?: string; // Village Infra
  postOfficeStatus?: string; // Pincode
  postOfficeName?: string; // Pincode
  deliveryStatus?: string; // Pincode
  householdCount?: number; // Pincode/Village
  economicFocus?: string; // District
  
  // Allow arbitrary keys for imported data
  [key: string]: any;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoFeature {
  id: string;
  type: 'Feature';
  properties: GeoMetadata;
  geometry: {
    type: 'Polygon' | 'Point' | 'MultiPolygon';
    coordinates: number[][][] | number[] | number[][][][]; // Polygon rings or Point [lng, lat]
  };
}

export interface GeoCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

export enum MapLayer {
  DISTRICTS = 'DISTRICTS',
  TALUKS = 'TALUKS',
  VILLAGES = 'VILLAGES',
  PINCODES = 'PINCODES',
}