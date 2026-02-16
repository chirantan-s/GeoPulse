import { GeoFeature } from '../types';

declare global {
  interface Window {
    google: any;
  }
}

// Helper to determine category based on Google Place types
// Updated to match the granular groupings defined in OSM logic
const getCategory = (types: string[] = []): string => {
    const t = new Set(types);
    
    // Groceries
    if (t.has('supermarket') || t.has('convenience_store') || t.has('grocery_or_supermarket')) return 'Groceries';
    
    // Food & Beverages
    if (t.has('bakery') || t.has('food') || t.has('restaurant') || t.has('cafe') || t.has('bar') || t.has('meal_takeaway') || t.has('meal_delivery')) return 'Food & Beverages';
    
    // Fashion
    if (t.has('clothing_store')) return 'Fashion';
    
    // Accessories
    if (t.has('shoe_store') || t.has('jewelry_store')) return 'Accessories';
    
    // Electronics
    if (t.has('electronics_store')) return 'Electronics';
    
    // Home & Living
    if (t.has('home_goods_store') || t.has('furniture_store')) return 'Home & Living';
    
    // Hardware & DIY
    if (t.has('hardware_store')) return 'Hardware & DIY';
    
    // Health
    if (t.has('pharmacy') || t.has('drugstore') || t.has('doctor') || t.has('hospital') || t.has('dentist')) return 'Health';
    
    // Beauty
    if (t.has('beauty_salon') || t.has('hair_care') || t.has('spa')) return 'Beauty';
    
    // Automotive
    if (t.has('car_dealer') || t.has('car_repair') || t.has('gas_station') || t.has('car_wash')) return 'Automotive';
    
    // Books & Stationery
    if (t.has('book_store') || t.has('library')) return 'Books & Stationery';
    
    // Gifts & Hobbies
    if (t.has('florist') || t.has('gift_shop') || t.has('pet_store') || t.has('art_gallery')) return 'Gifts & Hobbies';
    
    // Liquor & Tobacco
    if (t.has('liquor_store')) return 'Liquor & Tobacco';
    
    // Department Stores
    if (t.has('department_store') || t.has('shopping_mall')) return 'Department Stores';
    
    return 'General Retail';
};

// Transform Google Place Result to our GeoFeature
const transformToGeoFeature = (place: any): GeoFeature => {
  const category = getCategory(place.types);
  
  return {
    id: `store-${place.place_id}`,
    type: 'Feature',
    properties: {
      id: place.place_id,
      geocode: `STORE-${place.place_id.substring(0, 5)}`,
      name: place.name,
      type: 'Store',
      description: `Retail Store. Rating: ${place.rating} (${place.user_ratings_total})`,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      vicinity: place.vicinity,
      isOpenNow: place.opening_hours?.isOpen(), // isOpen() is a method in Google Maps JS API v3
      keyMarkets: place.types, 
      category: category, 
      subCategory: place.types?.[0]?.replace(/_/g, ' ') || 'store',
      // Google Places Detail API would be needed for phone/website in a list view, 
      // but 'nearbySearch' results often lack them. 
      // We can use them if present.
      phone: undefined, 
      website: undefined
    },
    geometry: {
      type: 'Point',
      coordinates: [place.geometry.location.lng(), place.geometry.location.lat()]
    }
  };
};

/**
 * Fetches retail stores using the Google Maps PlacesService.
 * Handles pagination (up to 3 pages / 60 results) automatically.
 * Note: Includes mandatory delays required by Google API for next_page_token validity.
 */
export const fetchRetailStores = async (
  lat: number,
  lng: number,
  radius: number = 5000,
  onProgress?: (progress: number, status: string) => void
): Promise<GeoFeature[]> => {
  if (!window.google || !window.google.maps || !window.google.maps.places) {
    console.error("Google Maps API is missing. Ensure the script is loaded with 'places' library.");
    throw new Error('Google Maps API not loaded');
  }

  // PlacesService requires a node, even if not used for map rendering
  const dummyNode = document.createElement('div');
  const service = new window.google.maps.places.PlacesService(dummyNode);

  const request = {
    location: new window.google.maps.LatLng(lat, lng),
    radius: radius,
    type: 'store', // Broad category to catch most retail
    // keyword: 'retail' // Removed keyword to get broader set of 'store' types
  };

  if (onProgress) onProgress(5, 'Connecting to Google Satellite...');

  return new Promise((resolve, reject) => {
    let allFeatures: GeoFeature[] = [];
    let pageCount = 0;

    const callback = (results: any[], status: any, pagination: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        
        pageCount++;
        // Transform current page results, Filtering out CLOSED_PERMANENTLY
        const features = results
           .filter((place: any) => place.business_status === 'OPERATIONAL' || place.business_status === 'CLOSED_TEMPORARILY')
           .map(transformToGeoFeature);
           
        allFeatures = [...allFeatures, ...features];

        // Estimate progress: 
        // Page 1: 35%, Page 2: 70%, Page 3: 100%
        const pct = Math.min(pageCount * 30 + 5, 95); 

        // Handle Pagination (API allows up to 3 pages)
        if (pagination && pagination.hasNextPage) {
           if (onProgress) onProgress(pct, `Analyzed ${allFeatures.length} locations...`);
           
           // We must wait for the next page token to become valid (approx 2 sec)
           setTimeout(() => {
               if (onProgress) onProgress(pct + 5, `Scanning deeper...`);
               pagination.nextPage();
           }, 2000); 
        } else {
           // No more pages, resolve all
           if (onProgress) onProgress(100, `Scan Complete (${allFeatures.length} found)`);
           resolve(allFeatures);
        }
      } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        // Return whatever we found so far (could be empty if first page, or partial if later page)
        if (onProgress) onProgress(100, `Scan Complete (${allFeatures.length} found)`);
        resolve(allFeatures);
      } else {
        console.error("Google Places Error:", status);
        reject(`Places API Error: ${status}`);
      }
    };

    service.nearbySearch(request, callback);
  });
};