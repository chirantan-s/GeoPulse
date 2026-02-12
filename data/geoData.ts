import { GeoCollection, GeoFeature } from '../types';
import { Delaunay } from 'd3-delaunay';

// --- Geometric Helpers ---

// Validate that a ring of coordinates contains only valid numbers
const isValidRing = (ring: number[][]): boolean => {
  if (!Array.isArray(ring) || ring.length < 3) return false;
  return ring.every(point => 
    Array.isArray(point) && 
    point.length >= 2 && 
    !isNaN(point[0]) && 
    !isNaN(point[1])
  );
};

// Check if a point is inside a polygon (Ray-casting algorithm)
const isPointInPolygon = (point: number[], vs: number[][]) => {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// Generate an irregular polygon around a center (for villages)
const generateOrganicPolygon = (centerLat: number, centerLng: number, baseRadius: number): number[][][] => {
  const points: number[][] = [];
  const sides = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides;
    const r = baseRadius * (0.8 + Math.random() * 0.4); // Randomize radius
    points.push([
      centerLng + r * Math.cos(angle),
      centerLat + r * Math.sin(angle) * 0.85 // Flatten lat slightly
    ]);
  }
  points.push(points[0]);
  return [points];
};

// --- Distance Calculation Helper ---
const getDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2)) * 111;
};

// Reference Locations
const LOC_CITY = { lat: 12.9716, lng: 77.5946, name: 'Bengaluru City' };
const LOC_AIRPORT = { lat: 13.1986, lng: 77.7066, name: 'Kempegowda Int. (KIA)' };

// Prominent Railway Stations in Bengaluru Urban & Rural
const RAILWAY_STATIONS = [
  { lat: 12.9781, lng: 77.5697, name: 'KSR Bengaluru City Junction (SBC)' },
  { lat: 13.0238, lng: 77.5529, name: 'Yesvantpur Junction (YPR)' },
  { lat: 12.9904, lng: 77.6526, name: 'Sir M. Visvesvaraya Terminal, Bengaluru (SMVT)' },
  { lat: 13.0005, lng: 77.6753, name: 'Krishnarajapuram Railway Station (KJM)' },
  { lat: 12.9936, lng: 77.5980, name: 'Bengaluru Cantonment Railway Station (BNC)' },
  { lat: 13.1017, lng: 77.5962, name: 'Yelahanka Junction (YNK)' },
  { lat: 12.9908, lng: 77.7286, name: 'Whitefield Railway Station (WFD)' },
  { lat: 13.0163, lng: 77.6433, name: 'Banaswadi Railway Station (BAND)' },
  { lat: 12.9060, lng: 77.4880, name: 'Kengeri Railway Station (KGI)' },
  { lat: 12.9079, lng: 77.6970, name: 'Carmelaram Railway Station (CRLM)' },
];

const getNearestStation = (lat: number, lng: number) => {
    let minDistance = Infinity;
    let nearest = RAILWAY_STATIONS[0];

    for (const station of RAILWAY_STATIONS) {
        const dist = getDistanceKm(lat, lng, station.lat, station.lng);
        if (dist < minDistance) {
            minDistance = dist;
            nearest = station;
        }
    }
    return { name: nearest.name, distance: minDistance };
}


// --- 1. REALISTIC TALUK BOUNDARIES ---
// Coordinates are [Lng, Lat]

// Key Junction Points (Shared borders to ensure no gaps)
const J_Nelamangala_Doddaballapur_BlrNorth = [77.42, 13.18];
const J_Doddaballapur_Devanahalli_BlrNorth = [77.61, 13.21];
const J_Devanahalli_Hoskote_BlrEast = [77.74, 13.08];
const J_BlrNorth_BlrEast_BlrSouth = [77.61, 12.97]; // Near City Center
const J_BlrSouth_BlrEast_Anekal = [77.66, 12.87];
const J_BlrSouth_Anekal_West = [77.53, 12.82];

// 1. NELAMANGALA (West/North-West)
const COORDS_NELAMANGALA = [
    J_Nelamangala_Doddaballapur_BlrNorth,
    [77.45, 13.10], // Border with Blr North
    [77.48, 13.02], // Border with Blr North
    [77.42, 12.96], // SW Tip
    [77.35, 12.98], // West boundary
    [77.25, 13.05], // West boundary
    [77.22, 13.15], // NW Tip
    [77.28, 13.25], // North boundary
    [77.35, 13.22], // North boundary
    J_Nelamangala_Doddaballapur_BlrNorth
];

// 2. DODDABALLAPUR (North)
const COORDS_DODDABALLAPUR = [
    J_Nelamangala_Doddaballapur_BlrNorth,
    [77.38, 13.25], // Border with Nelamangala
    [77.35, 13.35], // West
    [77.40, 13.45], // NW
    [77.45, 13.55], // North Tip
    [77.55, 13.52], // North
    [77.65, 13.48], // NE
    [77.62, 13.35], // East
    J_Doddaballapur_Devanahalli_BlrNorth,
    [77.52, 13.20], // Border with Blr North
    J_Nelamangala_Doddaballapur_BlrNorth
];

// 3. DEVANAHALLI (North-East)
const COORDS_DEVANAHALLI = [
    J_Doddaballapur_Devanahalli_BlrNorth,
    [77.62, 13.35], // Border with Doddaballapur
    [77.68, 13.42], // North
    [77.78, 13.40], // NE Tip
    [77.85, 13.30], // East
    [77.82, 13.20], // East
    [77.78, 13.15], // SE
    J_Devanahalli_Hoskote_BlrEast,
    [77.68, 13.15], // Border with Blr North
    J_Doddaballapur_Devanahalli_BlrNorth
];

// 4. HOSKOTE (East)
const COORDS_HOSKOTE = [
    J_Devanahalli_Hoskote_BlrEast,
    [77.78, 13.15], // North (Border with Devanahalli)
    [77.88, 13.12], // NE Tip
    [77.92, 13.00], // East
    [77.88, 12.90], // SE
    [77.80, 12.92], // South
    [77.75, 12.95], // Border with Blr East
    J_Devanahalli_Hoskote_BlrEast
];

// 5. BENGALURU NORTH (Central North)
const COORDS_BLR_NORTH = [
    J_Nelamangala_Doddaballapur_BlrNorth,
    [77.52, 13.20], // Border with Doddaballapur
    J_Doddaballapur_Devanahalli_BlrNorth,
    [77.68, 13.15], // Border with Devanahalli
    J_Devanahalli_Hoskote_BlrEast, // Tip touching Hoskote
    [77.70, 13.05], // Border with Blr East
    [77.65, 13.00], // Border with Blr East
    J_BlrNorth_BlrEast_BlrSouth,
    [77.55, 12.98], // Border with Blr South (Malleshwaram area)
    [77.50, 13.00], // West
    [77.48, 13.02], // Border with Nelamangala
    [77.45, 13.10], // Border with Nelamangala
    J_Nelamangala_Doddaballapur_BlrNorth
];

// 6. BENGALURU EAST (Central East)
const COORDS_BLR_EAST = [
    J_BlrNorth_BlrEast_BlrSouth,
    [77.65, 13.00], // Border with Blr North
    [77.70, 13.05], // Border with Blr North
    J_Devanahalli_Hoskote_BlrEast,
    [77.75, 12.95], // Border with Hoskote
    [77.80, 12.92], // Border with Hoskote
    [77.75, 12.88], // SE Tip (Sarjapur area)
    J_BlrSouth_BlrEast_Anekal,
    [77.65, 12.92], // Border with Blr South
    J_BlrNorth_BlrEast_BlrSouth
];

// 7. BENGALURU SOUTH (Central South)
const COORDS_BLR_SOUTH = [
    J_BlrNorth_BlrEast_BlrSouth,
    [77.65, 12.92], // Border with Blr East
    J_BlrSouth_BlrEast_Anekal,
    [77.60, 12.85], // Border with Anekal
    J_BlrSouth_Anekal_West,
    [77.48, 12.88], // West (Kengeri area)
    [77.48, 12.95], // West
    [77.55, 12.98], // Border with Blr North
    J_BlrNorth_BlrEast_BlrSouth
];

// 8. ANEKAL (Deep South)
const COORDS_ANEKAL = [
    J_BlrSouth_Anekal_West,
    [77.60, 12.85], // Border with Blr South
    J_BlrSouth_BlrEast_Anekal,
    [77.75, 12.88], // NE Tip (Border with Blr East)
    [77.82, 12.80], // East (Attibele)
    [77.78, 12.70], // SE
    [77.70, 12.65], // South Tip
    [77.60, 12.68], // SW
    [77.52, 12.75], // West
    J_BlrSouth_Anekal_West
];

interface TalukMeta {
  name: string;
  district: string;
  coords: number[][];
  population: number;
  literacyRate: number;
  center: [number, number];
  crops?: string[];
  keyMarkets?: string[];
}

const talukDataRaw: TalukMeta[] = [
  { name: 'Doddaballapur', district: 'Bengaluru Rural', coords: COORDS_DODDABALLAPUR, population: 297587, literacyRate: 78.2, center: [13.40, 77.55], crops: ['Ragi', 'Maize', 'Silk'], keyMarkets: ['Apparel Park', 'Weaving'] },
  { name: 'Devanahalli', district: 'Bengaluru Rural', coords: COORDS_DEVANAHALLI, population: 209622, literacyRate: 84.5, center: [13.25, 77.75], crops: ['Grapes', 'Vegetables', 'Flowers'], keyMarkets: ['Aerospace', 'Logistics'] },
  { name: 'Nelamangala', district: 'Bengaluru Rural', coords: COORDS_NELAMANGALA, population: 232145, literacyRate: 76.8, center: [13.10, 77.30], crops: ['Ragi', 'Arecanut', 'Coconut'], keyMarkets: ['Industrial', 'Warehousing'] },
  { name: 'Hoskote', district: 'Bengaluru Rural', coords: COORDS_HOSKOTE, population: 270818, literacyRate: 81.3, center: [13.05, 77.85], crops: ['Vegetables', 'Flowers', 'Tomato'], keyMarkets: ['Auto Components', 'Logistics'] },
  { name: 'Bengaluru North', district: 'Bengaluru Urban', coords: COORDS_BLR_NORTH, population: 1200000, literacyRate: 88.5, center: [13.08, 77.55], keyMarkets: ['Peenya Industrial', 'Research Inst.', 'Aerospace'] },
  { name: 'Bengaluru East', district: 'Bengaluru Urban', coords: COORDS_BLR_EAST, population: 1100000, literacyRate: 89.2, center: [13.00, 77.75], keyMarkets: ['IT/BT', 'Whitefield Cluster', 'Tech Parks'] },
  { name: 'Bengaluru South', district: 'Bengaluru Urban', coords: COORDS_BLR_SOUTH, population: 1500000, literacyRate: 90.1, center: [12.92, 77.58], keyMarkets: ['Software', 'Education Hub', 'Heavy Engg'] },
  { name: 'Anekal', district: 'Bengaluru Urban', coords: COORDS_ANEKAL, population: 600000, literacyRate: 82.4, center: [12.75, 77.65], crops: ['Ragi', 'Floriculture'], keyMarkets: ['Electronic City', 'Textiles'] },
];

export const taluksData: GeoCollection = {
  type: 'FeatureCollection',
  features: talukDataRaw.map((t, i) => {
    const distToCity = getDistanceKm(t.center[0], t.center[1], LOC_CITY.lat, LOC_CITY.lng);
    const distToAirport = getDistanceKm(t.center[0], t.center[1], LOC_AIRPORT.lat, LOC_AIRPORT.lng);
    const nearestRly = getNearestStation(t.center[0], t.center[1]);
    const tId = `taluk-${i}`;
    // Geocode Format: KAT{id} (Alphanumeric)
    const geocode = `KAT${String(i + 1).padStart(2, '0')}`;

    return {
      id: tId,
      type: 'Feature',
      properties: {
        id: tId,
        geocode: geocode,
        name: t.name,
        district: t.district,
        type: 'Taluk',
        population: t.population,
        literacyRate: t.literacyRate,
        areaSqKm: 200 + Math.random() * 100,
        description: `Administrative Taluk in ${t.district}`,
        nearestCity: LOC_CITY.name,
        distanceToCityKm: distToCity,
        nearestAirport: LOC_AIRPORT.name,
        distanceToAirportKm: distToAirport,
        nearestRailway: nearestRly.name,
        distanceToRailwayKm: nearestRly.distance,
        sexRatio: 930 + Math.floor(Math.random() * 40),
        mainCrops: t.crops,
        keyMarkets: t.keyMarkets,
        numVillages: 150 + Math.floor(Math.random() * 100),
        schoolCount: Math.floor(t.population / 2500),
        hospitalCount: Math.floor(t.population / 15000)
      },
      geometry: { type: 'Polygon', coordinates: [t.coords] }
    };
  })
};

// --- DISTRICTS DATA ---
export const districtsData: GeoCollection = {
  type: 'FeatureCollection',
  features: [
    {
      id: 'dist-rural',
      type: 'Feature',
      properties: {
        id: 'dist-rural',
        geocode: 'KAD01',
        name: 'Bengaluru Rural',
        type: 'District',
        description: 'District surrounding Bengaluru Urban.',
        population: 990923,
        literacyRate: 77.93,
        areaSqKm: 2298,
        nearestCity: LOC_CITY.name,
        distanceToCityKm: 0,
        nearestAirport: LOC_AIRPORT.name,
        distanceToAirportKm: 0,
        sexRatio: 946,
        numTaluks: 4,
        economicFocus: 'Agriculture, Textiles, Industrial Parks',
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
            [COORDS_DODDABALLAPUR],
            [COORDS_DEVANAHALLI],
            [COORDS_NELAMANGALA],
            [COORDS_HOSKOTE]
        ]
      }
    },
    {
      id: 'dist-urban',
      type: 'Feature',
      properties: {
         id: 'dist-urban',
         geocode: 'KAD02',
         name: 'Bengaluru Urban',
         type: 'District',
         description: 'The capital district of Karnataka.',
         population: 9621551,
         literacyRate: 87.67,
         areaSqKm: 2196,
         nearestCity: LOC_CITY.name,
         distanceToCityKm: 0,
         nearestAirport: LOC_AIRPORT.name,
         distanceToAirportKm: 15,
         sexRatio: 916,
         numTaluks: 5,
         economicFocus: 'IT/BT, Services, Manufacturing, Aerospace',
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
            [COORDS_BLR_NORTH],
            [COORDS_BLR_EAST],
            [COORDS_BLR_SOUTH],
            [COORDS_ANEKAL]
        ]
      }
    }
  ]
};

// --- VILLAGES ---
const REAL_VILLAGE_NAMES: Record<string, string[]> = {
    'Devanahalli': ['Avati', 'Bidalur', 'Kundana', 'Vijayapura', 'Channarayapatna', 'Kannamangala', 'Koira', 'Sathanur', 'Yeliyur', 'Venkatagirikote', 'Sadahalli', 'Devanahalli Town'],
    'Doddaballapur': ['Tubagere', 'Sasalu', 'Madhure', 'Doddabelavangala', 'Melekote', 'Raghunathapura', 'Konaghatta', 'Heggadihalli', 'Aroodi', 'Kadur', 'Doddaballapur Ind. Area'],
    'Hoskote': ['Anugondanahalli', 'Jadigenahalli', 'Nandagudi', 'Sulibele', 'Mugabal', 'Kalkunte', 'Doddagattiganabbe', 'Vagata', 'Muthasandra', 'Hoskote Town', 'Thavarekere'],
    'Nelamangala': ['Sompura', 'T. Begur', 'Kulumepalya', 'Dabaspet', 'Thyamagondlu', 'Baraguru', 'Manne', 'Nidavanda', 'Mahadevapura', 'Nelamangala Town', 'Arishinakunte'],
    'Anekal': ['Sarjapura', 'Attibele', 'Jigani', 'Marsur', 'Mugalur', 'Dommasandra', 'Neriga', 'Chandapura', 'Mayasandra', 'Indlavadi', 'Anekal Town', 'Hebbagodi'],
    'Bengaluru North': ['Hesaraghatta', 'Gopalapura', 'Singanayakanahalli', 'Bagalur', 'Kadalagere', 'Chikkabanavara', 'Srigandhada Kaval', 'Yelahanka New Town', 'Jakkur', 'Thanisandra'],
    'Bengaluru East': ['Varthur', 'Gunjur', 'Sorahunase', 'Immadihalli', 'Mullur', 'Panathur', 'Balagere', 'Hoodi', 'Kadugodi', 'Bellandur'],
    'Bengaluru South': ['Kengeri', 'Begur', 'Hulimavu', 'Gottigere', 'Tataguni', 'Agara', 'Uttarahalli', 'Konanakunte', 'Anjanapura', 'Vasanthapura'],
};

// Precise coordinates for key villages
const REAL_VILLAGE_LOCATIONS: Record<string, [number, number]> = {
    // Devanahalli (Rural)
    'Avati': [13.303, 77.726],
    'Bidalur': [13.218, 77.693],
    'Kundana': [13.208, 77.636],
    'Vijayapura': [13.293, 77.801],
    'Channarayapatna': [13.220, 77.750],
    'Kannamangala': [13.180, 77.730],
    'Koira': [13.220, 77.660],
    'Sathanur': [13.140, 77.650],
    'Yeliyur': [13.190, 77.720],
    'Venkatagirikote': [13.240, 77.710],
    'Sadahalli': [13.190, 77.680],
    'Devanahalli Town': [13.248, 77.713],

    // Doddaballapur (Rural)
    'Tubagere': [13.350, 77.450],
    'Sasalu': [13.260, 77.450],
    'Madhure': [13.220, 77.440],
    'Doddabelavangala': [13.380, 77.380],
    'Melekote': [13.320, 77.510],
    'Raghunathapura': [13.280, 77.520],
    'Konaghatta': [13.310, 77.540],
    'Heggadihalli': [13.380, 77.480],
    'Aroodi': [13.400, 77.420],
    'Kadur': [13.300, 77.400],
    'Doddaballapur Ind. Area': [13.280, 77.530],

    // Hoskote (Rural)
    'Anugondanahalli': [13.010, 77.820],
    'Jadigenahalli': [13.060, 77.850],
    'Nandagudi': [13.150, 77.880],
    'Sulibele': [13.120, 77.810],
    'Mugabal': [13.040, 77.860],
    'Kalkunte': [13.080, 77.750],
    'Doddagattiganabbe': [13.060, 77.800],
    'Vagata': [13.110, 77.860],
    'Muthasandra': [13.020, 77.790],
    'Hoskote Town': [13.070, 77.795],
    'Thavarekere': [13.000, 77.820],

    // Nelamangala (Rural)
    'Sompura': [13.240, 77.230],
    'T. Begur': [13.150, 77.300],
    'Kulumepalya': [13.120, 77.350],
    'Dabaspet': [13.240, 77.240], 
    'Thyamagondlu': [13.200, 77.280],
    'Baraguru': [13.180, 77.250],
    'Manne': [13.220, 77.320],
    'Nidavanda': [13.260, 77.220],
    'Mahadevapura': [13.120, 77.380],
    'Nelamangala Town': [13.095, 77.390],
    'Arishinakunte': [13.130, 77.420],

    // Anekal (Urban)
    'Sarjapura': [12.860, 77.780],
    'Attibele': [12.780, 77.770],
    'Jigani': [12.780, 77.640],
    'Marsur': [12.800, 77.700],
    'Mugalur': [12.880, 77.750],
    'Dommasandra': [12.890, 77.750],
    'Neriga': [12.920, 77.760],
    'Chandapura': [12.800, 77.700],
    'Mayasandra': [12.750, 77.720],
    'Indlavadi': [12.740, 77.680],
    'Anekal Town': [12.710, 77.690],
    'Hebbagodi': [12.840, 77.670],

    // Bengaluru North (Urban)
    'Hesaraghatta': [13.140, 77.480],
    'Gopalapura': [13.160, 77.460],
    'Singanayakanahalli': [13.120, 77.560],
    'Bagalur': [13.140, 77.640],
    'Kadalagere': [13.170, 77.600],
    'Chikkabanavara': [13.070, 77.510],
    'Srigandhada Kaval': [12.990, 77.500],
    'Yelahanka New Town': [13.100, 77.580],
    'Jakkur': [13.070, 77.600],
    'Thanisandra': [13.050, 77.630],

    // Bengaluru East (Urban)
    'Varthur': [12.940, 77.740],
    'Gunjur': [12.920, 77.740],
    'Sorahunase': [12.950, 77.750],
    'Immadihalli': [12.960, 77.760],
    'Mullur': [12.910, 77.730],
    'Panathur': [12.930, 77.700],
    'Balagere': [12.940, 77.720],
    'Hoodi': [12.990, 77.710],
    'Kadugodi': [12.995, 77.760],
    'Bellandur': [12.930, 77.670],

    // Bengaluru South (Urban)
    'Kengeri': [12.910, 77.480],
    'Begur': [12.880, 77.630],
    'Hulimavu': [12.870, 77.600],
    'Gottigere': [12.860, 77.580],
    'Tataguni': [12.850, 77.520],
    'Agara': [12.920, 77.640],
    'Uttarahalli': [12.900, 77.540],
    'Konanakunte': [12.890, 77.570],
    'Anjanapura': [12.860, 77.560],
    'Vasanthapura': [12.890, 77.540],
};


const villagePrefixes = ['Doda', 'Chikka', 'Malla', 'Golla', 'Hosa', 'Byra', 'Kumba', 'Sidda', 'Rama', 'Shiva', 'Nara'];
const villageSuffixes = ['pura', 'halli', 'kere', 'gudda', 'palya', 'sandra', 'kote', 'ur', 'pete', 'gere'];

const generatedVillages: GeoFeature[] = [];
let vId = 0;
let villageGeocodeCounter = 1001;

// Function to create a village feature
const createVillageFeature = (name: string, lat: number, lng: number, talukName: string, districtName: string, crops?: string[], keyMarkets?: string[]) => {
    const poly = generateOrganicPolygon(lat, lng, 0.005);
    const distToCity = getDistanceKm(lat, lng, LOC_CITY.lat, LOC_CITY.lng);
    const distToAirport = getDistanceKm(lat, lng, LOC_AIRPORT.lat, LOC_AIRPORT.lng);
    const nearestRly = getNearestStation(lat, lng);
    
    const vIDString = `village-${vId++}`;
    const geocode = `KAV${villageGeocodeCounter++}`;
    const population = 500 + Math.floor(Math.random() * 4000);

    const waterSources = ['Borewell', 'Kaveri Connection', 'Local Lake/Tank', 'Panchayat Supply'];
    const roads = ['Asphalted', 'Concrete', 'Gravel/Mud', 'All-weather'];
    const buses = ['Hourly', 'Every 30 mins', 'Twice a day', 'Irregular'];

    if (isValidRing(poly[0])) {
        return {
          id: vIDString,
          type: 'Feature',
          properties: {
            id: vIDString,
            geocode: geocode,
            name: name,
            type: 'Village',
            district: districtName,
            taluk: talukName,
            population: population,
            areaSqKm: 1 + Math.random() * 2,
            literacyRate: 60 + Math.random() * 30,
            nearestCity: LOC_CITY.name,
            distanceToCityKm: distToCity,
            nearestAirport: LOC_AIRPORT.name,
            distanceToAirportKm: distToAirport,
            nearestRailway: nearestRly.name,
            distanceToRailwayKm: nearestRly.distance,
            description: `A village in ${talukName} taluk.`,
            waterSource: waterSources[Math.floor(Math.random() * waterSources.length)],
            roadCondition: roads[Math.floor(Math.random() * roads.length)],
            busFrequency: buses[Math.floor(Math.random() * buses.length)],
            householdCount: Math.floor(population / 4.5),
            schoolCount: Math.floor(Math.random() * 3),
            mainCrops: crops,
            keyMarkets: keyMarkets
          },
          geometry: {
            type: 'Polygon',
            coordinates: poly
          }
        } as GeoFeature;
    }
    return null;
}

talukDataRaw.forEach(taluk => {
  const lats = taluk.coords.map(c => c[1]);
  const lngs = taluk.coords.map(c => c[0]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

  let count = 0;
  const targetCount = 35; 
  const realNames = REAL_VILLAGE_NAMES[taluk.name] || [];

  // 1. First place the REAL villages at their known locations
  realNames.forEach(name => {
      if (REAL_VILLAGE_LOCATIONS[name]) {
          const [lat, lng] = REAL_VILLAGE_LOCATIONS[name];
          const feature = createVillageFeature(name, lat, lng, taluk.name, taluk.district, taluk.crops, taluk.keyMarkets);
          if (feature) {
              generatedVillages.push(feature);
              count++;
          }
      }
  });

  // 2. Then fill the remaining count with random villages
  let attempts = 0;
  while (count < targetCount && attempts < 400) {
    attempts++;
    const lat = minLat + Math.random() * (maxLat - minLat);
    const lng = minLng + Math.random() * (maxLng - minLng);
    
    if (isNaN(lat) || isNaN(lng)) continue;

    if (isPointInPolygon([lng, lat], taluk.coords)) {
      let name = villagePrefixes[Math.floor(Math.random() * villagePrefixes.length)] + 
                 villageSuffixes[Math.floor(Math.random() * villageSuffixes.length)];
      
      const feature = createVillageFeature(name, lat, lng, taluk.name, taluk.district, taluk.crops, taluk.keyMarkets);
      if (feature) {
        generatedVillages.push(feature);
        count++;
      }
    }
  }
});

export const villagesData: GeoCollection = {
  type: 'FeatureCollection',
  features: generatedVillages
};

// --- PINCODES ---

interface PincodeDef {
    code: string;
    lat: number;
    lng: number;
    areaName: string;
    district: string;
    markets?: string[];
}

const REAL_PINCODES: PincodeDef[] = [
    // --- CENTRAL BENGALURU ---
    { code: '560001', lat: 12.975, lng: 77.605, areaName: 'M.G. Road', district: 'Bengaluru Urban', markets: ['High St Retail', 'Corporate HQs'] },
    { code: '560002', lat: 12.965, lng: 77.580, areaName: 'City Market', district: 'Bengaluru Urban', markets: ['Wholesale Flowers', 'Vegetable Market', 'Hardware'] },
    { code: '560003', lat: 13.000, lng: 77.570, areaName: 'Malleswaram', district: 'Bengaluru Urban', markets: ['Silk Sarees', 'Flower Market', 'Street Food'] },
    { code: '560004', lat: 12.940, lng: 77.575, areaName: 'Basavanagudi', district: 'Bengaluru Urban', markets: ['Spices', 'Traditional Textiles', 'Religious Goods'] },
    { code: '560005', lat: 13.005, lng: 77.610, areaName: 'Fraser Town', district: 'Bengaluru Urban', markets: ['Food', 'Bakery'] },
    { code: '560009', lat: 12.980, lng: 77.575, areaName: 'Gandhinagar', district: 'Bengaluru Urban', markets: ['Cinema', 'Wholesale'] },
    { code: '560020', lat: 12.990, lng: 77.575, areaName: 'Seshadripuram', district: 'Bengaluru Urban', markets: ['Book Stores', 'Coaching Centers'] },
    { code: '560025', lat: 12.965, lng: 77.600, areaName: 'Richmond Town', district: 'Bengaluru Urban', markets: ['Furniture', 'Lifestyle Boutiques'] },
    { code: '560027', lat: 12.960, lng: 77.590, areaName: 'Wilson Garden', district: 'Bengaluru Urban', markets: ['Offices'] },
    { code: '560046', lat: 13.000, lng: 77.600, areaName: 'Benson Town', district: 'Bengaluru Urban', markets: ['Residential'] },
    { code: '560053', lat: 12.970, lng: 77.580, areaName: 'Cottonpet', district: 'Bengaluru Urban', markets: ['Wholesale Textiles'] },

    // --- NORTH BENGALURU ---
    { code: '560006', lat: 13.015, lng: 77.590, areaName: 'J.C. Nagar', district: 'Bengaluru Urban', markets: ['Automobile Spares', 'Furniture'] },
    { code: '560012', lat: 13.030, lng: 77.550, areaName: 'IISC', district: 'Bengaluru Urban', markets: ['Education'] },
    { code: '560013', lat: 13.050, lng: 77.540, areaName: 'Jalahalli', district: 'Bengaluru Urban', markets: ['BEL', 'Industry'] },
    { code: '560015', lat: 13.070, lng: 77.530, areaName: 'Gangamma Circle', district: 'Bengaluru Urban', markets: ['Residential'] },
    { code: '560022', lat: 13.020, lng: 77.540, areaName: 'Yeshwanthpur', district: 'Bengaluru Urban', markets: ['APMC Yard', 'Wholesale Grains', 'Transport'] },
    { code: '560024', lat: 13.045, lng: 77.590, areaName: 'Hebbal', district: 'Bengaluru Urban', markets: ['Tech Parks', 'Real Estate'] },
    { code: '560032', lat: 13.030, lng: 77.595, areaName: 'R.T. Nagar', district: 'Bengaluru Urban', markets: ['Retail', 'Residential'] },
    { code: '560054', lat: 13.040, lng: 77.550, areaName: 'Mathikere', district: 'Bengaluru Urban', markets: ['Student Services', 'Retail'] },
    { code: '560057', lat: 13.040, lng: 77.510, areaName: 'Dasarahalli', district: 'Bengaluru Urban', markets: ['Peenya Ind. Estate', 'Manufacturing'] },
    { code: '560058', lat: 13.030, lng: 77.500, areaName: 'Peenya', district: 'Bengaluru Urban', markets: ['Heavy Industries'] },
    { code: '560064', lat: 13.100, lng: 77.590, areaName: 'Yelahanka', district: 'Bengaluru Urban', markets: ['Aerospace', 'Ceramics', 'Defence'] },
    { code: '560092', lat: 13.065, lng: 77.595, areaName: 'Sahakara Nagar', district: 'Bengaluru Urban', markets: ['Residential', 'Retail'] },
    { code: '560094', lat: 13.030, lng: 77.570, areaName: 'Sanjay Nagar', district: 'Bengaluru Urban', markets: ['Residential', 'Institutes'] },
    { code: '560097', lat: 13.080, lng: 77.560, areaName: 'Vidyaranyapura', district: 'Bengaluru Urban', markets: ['Residential', 'Schools'] },
    { code: '560063', lat: 13.060, lng: 77.540, areaName: 'Jalahalli West', district: 'Bengaluru Urban', markets: ['Air Force', 'Electronics'] },
    { code: '560090', lat: 13.060, lng: 77.520, areaName: 'Chikkabanavara', district: 'Bengaluru Urban', markets: ['Railway Hub'] },

    // --- EAST BENGALURU ---
    { code: '560008', lat: 12.975, lng: 77.625, areaName: 'Ulsoor', district: 'Bengaluru Urban', markets: ['Jewellery', 'Boutiques'] },
    { code: '560016', lat: 13.000, lng: 77.660, areaName: 'Ramamurthy Nagar', district: 'Bengaluru Urban', markets: ['Residential'] },
    { code: '560017', lat: 12.955, lng: 77.655, areaName: 'Old Airport Rd', district: 'Bengaluru Urban', markets: ['Aerospace', 'Hotels'] },
    { code: '560033', lat: 13.000, lng: 77.630, areaName: 'Maruthi Sevanagar', district: 'Bengaluru Urban', markets: ['Residential'] },
    { code: '560036', lat: 13.010, lng: 77.690, areaName: 'Krishnarajapuram', district: 'Bengaluru Urban', markets: ['Railway', 'Market'] },
    { code: '560037', lat: 12.955, lng: 77.700, areaName: 'Marathahalli', district: 'Bengaluru Urban', markets: ['Electronics', 'Factory Outlets'] },
    { code: '560038', lat: 12.975, lng: 77.640, areaName: 'Indiranagar', district: 'Bengaluru Urban', markets: ['F&B', 'Fashion', 'Startups'] },
    { code: '560043', lat: 13.020, lng: 77.650, areaName: 'Kalyan Nagar', district: 'Bengaluru Urban', markets: ['Retail', 'Dining'] },
    { code: '560045', lat: 13.030, lng: 77.610, areaName: 'Nagawara', district: 'Bengaluru Urban', markets: ['Tech Park'] },
    { code: '560048', lat: 12.990, lng: 77.690, areaName: 'Mahadevapura', district: 'Bengaluru Urban', markets: ['Tech Parks', 'Corporate'] },
    { code: '560049', lat: 13.020, lng: 77.720, areaName: 'Virgonagar', district: 'Bengaluru Urban', markets: ['Industrial'] },
    { code: '560066', lat: 12.970, lng: 77.750, areaName: 'Whitefield', district: 'Bengaluru Urban', markets: ['IT Services', 'Malls', 'Intl Schools'] },
    { code: '560067', lat: 13.000, lng: 77.760, areaName: 'Kadugodi', district: 'Bengaluru Urban', markets: ['Logistics', 'Warehousing'] },
    { code: '560071', lat: 12.950, lng: 77.630, areaName: 'Domlur', district: 'Bengaluru Urban', markets: ['IT', 'Offices'] },
    { code: '560077', lat: 13.050, lng: 77.630, areaName: 'Kothanur', district: 'Bengaluru Urban', markets: ['Residential'] },
    { code: '560093', lat: 12.980, lng: 77.660, areaName: 'C.V. Raman Nagar', district: 'Bengaluru Urban', markets: ['DRDO', 'Tech'] },
    { code: '560105', lat: 13.000, lng: 77.780, areaName: 'Seegehalli', district: 'Bengaluru Urban', markets: ['Residential'] },

    // --- SOUTH BENGALURU ---
    { code: '560011', lat: 12.930, lng: 77.585, areaName: 'Jayanagar', district: 'Bengaluru Urban', markets: ['Shopping Complex', 'Retail', 'Jewellery'] },
    { code: '560019', lat: 12.940, lng: 77.560, areaName: 'Hanumanthnagar', district: 'Bengaluru Urban', markets: ['Residential'] },
    { code: '560028', lat: 12.910, lng: 77.570, areaName: 'Thyagarajanagar', district: 'Bengaluru Urban', markets: ['Residential'] },
    { code: '560029', lat: 12.920, lng: 77.600, areaName: 'BTM 1st Stage', district: 'Bengaluru Urban', markets: ['Residential'] },
    { code: '560030', lat: 12.930, lng: 77.610, areaName: 'Adugodi', district: 'Bengaluru Urban', markets: ['Tech', 'Police'] },
    { code: '560034', lat: 12.930, lng: 77.625, areaName: 'Koramangala', district: 'Bengaluru Urban', markets: ['Startups', 'F&B', 'Lifestyle'] },
    { code: '560035', lat: 12.905, lng: 77.700, areaName: 'Sarjapur Road', district: 'Bengaluru Urban', markets: ['IT/BT', 'Schools'] },
    { code: '560041', lat: 12.920, lng: 77.590, areaName: 'Jayanagar 9th Block', district: 'Bengaluru Urban', markets: ['Residential'] },
    { code: '560047', lat: 12.945, lng: 77.615, areaName: 'Vivek Nagar', district: 'Bengaluru Urban', markets: ['Residential'] },
    { code: '560050', lat: 12.940, lng: 77.555, areaName: 'Hanumanthnagar', district: 'Bengaluru Urban', markets: ['Residential', 'Small Retail'] },
    { code: '560061', lat: 12.890, lng: 77.540, areaName: 'Subramanyapura', district: 'Bengaluru Urban', markets: ['Residential', 'Real Estate'] },
    { code: '560062', lat: 12.870, lng: 77.550, areaName: 'Doddakallasandra', district: 'Bengaluru Urban', markets: ['Residential'] },
    { code: '560068', lat: 12.900, lng: 77.625, areaName: 'Bommanahalli', district: 'Bengaluru Urban', markets: ['Garment Mfg', 'Textiles'] },
    { code: '560069', lat: 12.920, lng: 77.590, areaName: 'Jayanagar 4th T Block', district: 'Bengaluru Urban', markets: ['Residential'] },
    { code: '560070', lat: 12.920, lng: 77.570, areaName: 'Banashankari II Stage', district: 'Bengaluru Urban', markets: ['Commercial'] },
    { code: '560076', lat: 12.910, lng: 77.605, areaName: 'BTM Layout', district: 'Bengaluru Urban', markets: ['Paying Guest Acc', 'Coaching', 'IT'] },
    { code: '560078', lat: 12.905, lng: 77.585, areaName: 'JP Nagar', district: 'Bengaluru Urban', markets: ['Arts', 'Culture', 'Retail'] },
    { code: '560083', lat: 12.820, lng: 77.590, areaName: 'Bannerghatta', district: 'Bengaluru Urban', markets: ['National Park', 'Tourism'] },
    { code: '560085', lat: 12.925, lng: 77.545, areaName: 'Banashankari', district: 'Bengaluru Urban', markets: ['Retail', 'Transport Hub'] },
    { code: '560099', lat: 12.820, lng: 77.680, areaName: 'Bommasandra', district: 'Bengaluru Urban', markets: ['Industrial Area', 'Pharma'] },
    { code: '560100', lat: 12.845, lng: 77.665, areaName: 'Electronic City', district: 'Bengaluru Urban', markets: ['IT Campus', 'Hardware Mfg', 'Biotech'] },
    { code: '560102', lat: 12.910, lng: 77.650, areaName: 'HSR Layout', district: 'Bengaluru Urban', markets: ['Startups', 'Co-working', 'Fashion'] },
    { code: '560103', lat: 12.930, lng: 77.680, areaName: 'Bellandur', district: 'Bengaluru Urban', markets: ['Tech SEZ', 'Real Estate'] },

    // --- WEST BENGALURU ---
    { code: '560010', lat: 12.985, lng: 77.555, areaName: 'Rajajinagar', district: 'Bengaluru Urban', markets: ['Industrial Estate', 'Malls'] },
    { code: '560018', lat: 12.960, lng: 77.550, areaName: 'Chamrajpet', district: 'Bengaluru Urban', markets: ['Wholesale'] },
    { code: '560021', lat: 12.995, lng: 77.560, areaName: 'Srirampura', district: 'Bengaluru Urban', markets: ['Textiles'] },
    { code: '560023', lat: 12.970, lng: 77.540, areaName: 'Magadi Road', district: 'Bengaluru Urban', markets: ['Transport'] },
    { code: '560026', lat: 12.950, lng: 77.530, areaName: 'Mysore Road', district: 'Bengaluru Urban', markets: ['Timber', 'Transport'] },
    { code: '560039', lat: 12.950, lng: 77.520, areaName: 'Nayandahalli', district: 'Bengaluru Urban', markets: ['Transit'] },
    { code: '560040', lat: 12.960, lng: 77.535, areaName: 'Vijayanagar', district: 'Bengaluru Urban', markets: ['Books', 'Clothing'] },
    { code: '560056', lat: 12.950, lng: 77.510, areaName: 'Bangalore University', district: 'Bengaluru Urban', markets: ['Education'] },
    { code: '560059', lat: 12.920, lng: 77.490, areaName: 'Kengeri Satellite Town', district: 'Bengaluru Urban', markets: ['Residential'] },
    { code: '560060', lat: 12.900, lng: 77.480, areaName: 'Kengeri', district: 'Bengaluru Urban', markets: ['Education', 'Transport'] },
    { code: '560072', lat: 12.965, lng: 77.510, areaName: 'Nagarbhavi', district: 'Bengaluru Urban', markets: ['Education (University)', 'Residential'] },
    { code: '560073', lat: 13.050, lng: 77.500, areaName: 'Nagasandra', district: 'Bengaluru Urban', markets: ['Industry'] },
    { code: '560074', lat: 12.890, lng: 77.450, areaName: 'Kumbalgodu', district: 'Bengaluru Urban', markets: ['Industry', 'Education'] },
    { code: '560079', lat: 12.970, lng: 77.520, areaName: 'Magadi Road (West)', district: 'Bengaluru Urban', markets: ['Wholesale'] },
    { code: '560091', lat: 12.980, lng: 77.490, areaName: 'Viswaneedam', district: 'Bengaluru Urban', markets: ['Small Industries'] },
    { code: '560096', lat: 13.010, lng: 77.520, areaName: 'Nandini Layout', district: 'Bengaluru Urban', markets: ['Residential'] },
    { code: '560098', lat: 12.920, lng: 77.510, areaName: 'Rajarajeshwari Nagar', district: 'Bengaluru Urban', markets: ['Residential', 'Temples'] },

    // --- BENGALURU RURAL & OUTSKIRTS ---
    { code: '562110', lat: 13.200, lng: 77.700, areaName: 'Bial (Airport)', district: 'Bengaluru Rural', markets: ['Airport Services'] },
    { code: '562114', lat: 13.250, lng: 77.230, areaName: 'Dobbaspet', district: 'Bengaluru Rural', markets: ['Industrial Area', 'Logistics'] },
    { code: '562123', lat: 13.095, lng: 77.395, areaName: 'Nelamangala', district: 'Bengaluru Rural', markets: ['Warehousing', 'Silk Weaving'] },
    { code: '562125', lat: 13.110, lng: 77.460, areaName: 'Shivakote', district: 'Bengaluru Urban', markets: ['Agriculture'] },
    { code: '562129', lat: 13.070, lng: 77.795, areaName: 'Hoskote', district: 'Bengaluru Rural', markets: ['Auto Components', 'Industrial'] },
    { code: '562135', lat: 12.950, lng: 77.850, areaName: 'Tavarekere', district: 'Bengaluru Rural', markets: ['Brick Kilns', 'Agro'] },
    { code: '562149', lat: 13.170, lng: 77.560, areaName: 'Rajanukunte', district: 'Bengaluru Urban', markets: ['Residential', 'Resorts'] },
    { code: '562157', lat: 13.245, lng: 77.710, areaName: 'Devanahalli', district: 'Bengaluru Rural', markets: ['Logistics', 'Agro Processing', 'Tourism'] },
    { code: '562162', lat: 13.150, lng: 77.450, areaName: 'Arishinakunte', district: 'Bengaluru Rural', markets: ['Agro'] },
    { code: '562163', lat: 13.200, lng: 77.420, areaName: 'Thyamagondlu', district: 'Bengaluru Rural', markets: ['Agro'] },
    { code: '562164', lat: 13.180, lng: 77.520, areaName: 'Heggunda', district: 'Bengaluru Rural', markets: ['Agriculture'] },
    { code: '561203', lat: 13.290, lng: 77.540, areaName: 'Doddaballapur', district: 'Bengaluru Rural', markets: ['Apparel Park', 'Powerloom'] },
    { code: '561204', lat: 13.380, lng: 77.380, areaName: 'Doddabelavangala', district: 'Bengaluru Rural', markets: ['Rural Market'] },
    { code: '561205', lat: 13.350, lng: 77.450, areaName: 'Tubagere', district: 'Bengaluru Rural', markets: ['Sericulture', 'Vegetables'] },
    { code: '560089', lat: 13.140, lng: 77.490, areaName: 'Hesaraghatta', district: 'Bengaluru Urban', markets: ['Farms', 'Research Inst'] },
    { code: '562106', lat: 12.780, lng: 77.700, areaName: 'Anekal', district: 'Bengaluru Urban', markets: ['Textiles', 'Small Scale Ind'] },
    { code: '562107', lat: 12.750, lng: 77.600, areaName: 'Jigani', district: 'Bengaluru Urban', markets: ['Granite', 'Manufacturing'] },
];

const points: [number, number][] = REAL_PINCODES.map(p => [p.lng, p.lat]);
const voronoiBounds: [number, number, number, number] = [77.10, 12.50, 78.10, 13.65];
const generatedPincodes: GeoFeature[] = [];

try {
  const delaunay = Delaunay.from(points);
  const voronoi = delaunay.voronoi(voronoiBounds);

  for (let i = 0; i < REAL_PINCODES.length; i++) {
      const poly = voronoi.cellPolygon(i);
      const distToCity = getDistanceKm(REAL_PINCODES[i].lat, REAL_PINCODES[i].lng, LOC_CITY.lat, LOC_CITY.lng);
      const distToAirport = getDistanceKm(REAL_PINCODES[i].lat, REAL_PINCODES[i].lng, LOC_AIRPORT.lat, LOC_AIRPORT.lng);
      const nearestRly = getNearestStation(REAL_PINCODES[i].lat, REAL_PINCODES[i].lng);
      
      const pId = `pin-${REAL_PINCODES[i].code}`;
      const population = 20000 + Math.floor(Math.random() * 80000);
      const poStatus = Math.random() > 0.8 ? 'Head Post Office' : (Math.random() > 0.4 ? 'Sub Post Office' : 'Branch Post Office');
      const suffix = poStatus === 'Head Post Office' ? 'H.O' : (poStatus === 'Sub Post Office' ? 'S.O' : 'B.O');
      const poName = `${REAL_PINCODES[i].areaName} ${suffix}`;
      
      // Geocode Format: KAP{pincode}
      const geocode = `KAP${REAL_PINCODES[i].code}`;

      if (poly && isValidRing(poly)) {
          generatedPincodes.push({
              id: pId,
              type: 'Feature',
              properties: {
                  id: pId,
                  geocode: geocode,
                  name: `${REAL_PINCODES[i].code} - ${REAL_PINCODES[i].areaName}`,
                  type: 'Pincode',
                  district: REAL_PINCODES[i].district,
                  population: population,
                  areaSqKm: 10 + Math.random() * 20,
                  literacyRate: 75 + Math.random() * 20,
                  nearestCity: LOC_CITY.name,
                  distanceToCityKm: distToCity,
                  nearestAirport: LOC_AIRPORT.name,
                  distanceToAirportKm: distToAirport,
                  nearestRailway: nearestRly.name,
                  distanceToRailwayKm: nearestRly.distance,
                  postOfficeStatus: poStatus,
                  postOfficeName: poName,
                  deliveryStatus: Math.random() > 0.05 ? 'Delivery Available' : 'Non-Delivery',
                  householdCount: Math.floor(population / 4),
                  keyMarkets: REAL_PINCODES[i].markets || []
              },
              geometry: {
                  type: 'Polygon',
                  coordinates: [poly]
              }
          });
      }
  }
} catch (e) {
  console.warn("Voronoi generation failed or partial", e);
}

export const pincodesData: GeoCollection = {
  type: 'FeatureCollection',
  features: generatedPincodes
};