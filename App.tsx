import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import MapViewer from './components/MapViewer';
import InfoPanel from './components/InfoPanel';
import { GeoMetadata, GeoCollection, GeoFeature } from './types';
import { Map as MapIcon, Layers, Upload, Download, Activity, Globe, ShoppingBag, Search, ChevronDown, ChevronUp, CheckSquare, Square, Filter, X, Star, Check } from 'lucide-react';
import { districtsData, taluksData, villagesData, pincodesData } from './data/geoData';
// SWITCHED PROVIDER: Reverted to OSM due to invalid/missing Google API Key.
// Synthetic ratings will be generated for demonstration purposes.
import { fetchRetailStores, fetchRetailStoresBounded } from './utils/osmPlaces';

// Helper to convert GeoFeature array to CSV string
const convertToCSV = (features: GeoFeature[]) => {
  if (features.length === 0) return '';
  
  // Collect all unique keys from properties
  const allKeys = new Set<string>();
  features.forEach(f => Object.keys(f.properties).forEach(k => allKeys.add(k)));
  const headers = Array.from(allKeys);
  headers.push('geometry'); // Add geometry column

  const csvRows = [headers.join(',')];

  features.forEach(f => {
    const row = headers.map(header => {
      if (header === 'geometry') {
         return `"${JSON.stringify(f.geometry).replace(/"/g, '""')}"`;
      }
      let val = f.properties[header];
      if (val === undefined) return '';
      if (typeof val === 'string') {
        val = val.replace(/"/g, '""');
        if (val.includes(',')) return `"${val}"`;
        return val;
      }
      if (Array.isArray(val) || typeof val === 'object') {
        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      }
      return val;
    });
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}

const App: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<GeoFeature | null>(null);
  
  // State for data to allow imports to modify it
  const [districts, setDistricts] = useState<GeoCollection>(districtsData);
  const [taluks, setTaluks] = useState<GeoCollection>(taluksData);
  const [villages, setVillages] = useState<GeoCollection>(villagesData);
  const [pincodes, setPincodes] = useState<GeoCollection>(pincodesData);
  
  // Stores State
  const [stores, setStores] = useState<GeoFeature[]>([]);
  // Multi-select state: Set of indices. Default empty (no selection).
  const [selectedRegionIndices, setSelectedRegionIndices] = useState<Set<number>>(new Set());
  const [isRegionMenuOpen, setIsRegionMenuOpen] = useState(false);

  // Filters State: Multi-select
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedRatings, setSelectedRatings] = useState<Set<number>>(new Set()); // Buckets: 3, 4, 4.5
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<string>('');
  const [scanPercentage, setScanPercentage] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const regionMenuRef = useRef<HTMLDivElement>(null);

  // Dynamically calculate scan regions from Taluks Data to ensure full coverage
  const scanRegions = useMemo(() => {
    return taluksData.features.map((feature, idx) => {
        const props = feature.properties;
        // feature.geometry.coordinates[0] is the linear ring of the Polygon
        // The type definition says coordinates is number[][][]
        const coordinates = feature.geometry.coordinates as number[][][];
        const ring = coordinates[0];
        const lats = ring.map(c => c[1]);
        const lngs = ring.map(c => c[0]);
        
        return {
            id: idx, // Use index as ID for selection logic consistency
            name: props.name,
            group: props.district,
            bbox: {
                south: Math.min(...lats),
                north: Math.max(...lats),
                west: Math.min(...lngs),
                east: Math.max(...lngs)
            }
        };
    }).sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  }, []);

  // Close region menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (regionMenuRef.current && !regionMenuRef.current.contains(event.target as Node)) {
            setIsRegionMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute Categories from Loaded Stores
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    stores.forEach(s => {
        if (s.properties.category) cats.add(s.properties.category);
    });
    return Array.from(cats).sort();
  }, [stores]);

  // Apply Filters
  const filteredStores = useMemo(() => {
    return stores.filter(s => {
        // 1. Category Filter (OR logic between selections)
        if (selectedCategories.size > 0 && !selectedCategories.has(s.properties.category || '')) {
            return false;
        }
        
        // 2. Rating Filter (OR logic between buckets)
        // If rating buckets are selected, we must match AT LEAST one bucket.
        if (selectedRatings.size > 0) {
            const r = s.properties.rating;
            // If store has no rating, it cannot match a rating filter
            if (r === undefined || r === null) return false;
            
            let match = false;
            for (let stars of Array.from(selectedRatings)) {
                 if (r >= stars) match = true;
            }
            if (!match) return false;
        }

        return true;
    });
  }, [stores, selectedCategories, selectedRatings]);

  const toggleCategory = (cat: string) => {
      const newSet = new Set(selectedCategories);
      if (newSet.has(cat)) newSet.delete(cat);
      else newSet.add(cat);
      setSelectedCategories(newSet);
  };

  const toggleRating = (stars: number) => {
      const newSet = new Set(selectedRatings);
      if (newSet.has(stars)) newSet.delete(stars);
      else newSet.add(stars);
      setSelectedRatings(newSet);
  };

  const clearFilters = () => {
      setSelectedCategories(new Set());
      setSelectedRatings(new Set());
  };

  const handleFeatureSelect = (data: GeoFeature) => {
    setSelectedFeature(data);
  };
  
  const handleFeatureHover = (data: GeoMetadata | null) => {
      // Hover logic handled internally
  };

  const toggleRegion = (index: number) => {
      const newSet = new Set(selectedRegionIndices);
      if (newSet.has(index)) {
          newSet.delete(index); 
      } else {
          newSet.add(index);
      }
      setSelectedRegionIndices(newSet);
  };

  const handleScanStores = async () => {
      // Map selection indices to the scanRegions array
      let regionsToScan = scanRegions.filter((_, idx) => selectedRegionIndices.has(idx));
      
      // If no regions selected, scan ALL regions (Districts)
      if (regionsToScan.length === 0) {
          if (window.confirm("No specific region selected. Scanning entire Bengaluru Urban & Rural districts? This may take a while.")) {
              regionsToScan = scanRegions;
          } else {
              return;
          }
      }

      setIsScanning(true);
      setScanProgress('Initializing Scan...');
      setScanPercentage(0);
      
      let allStores: GeoFeature[] = [];
      const totalRegions = regionsToScan.length;

      try {
          for (let i = 0; i < totalRegions; i++) {
              const region = regionsToScan[i];
              setScanProgress(`Scanning ${region.name} (${i + 1}/${totalRegions})...`);
              
              const startPct = (i / totalRegions) * 100;
              
              // Use Bounded Fetch based on Taluk BBox
              const results = await fetchRetailStoresBounded(
                region.bbox.south,
                region.bbox.west,
                region.bbox.north,
                region.bbox.east,
                (pct, status) => {
                    const globalPct = startPct + (pct * (1 / totalRegions));
                    setScanPercentage(Math.round(globalPct));
                    if (totalRegions === 1) setScanProgress(status);
                }
              ); 
              
              allStores = [...allStores, ...results];
          }
          
          setStores(allStores);
          setShowFilterBar(true); 
          
          if (allStores.length === 0) {
              alert("No stores found in scanned sectors.");
          }
      } catch (error) {
          console.error("Scan failed", error);
          alert("Scan failed. Check network connection or try again later.");
      } finally {
          setIsScanning(false);
          setScanProgress('');
          setScanPercentage(0);
      }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target?.result as string;
        try {
            let dataToImport: Record<string, any>[] = [];
            
            // Basic CSV Parse
            if (file.name.endsWith('.csv')) {
                const lines = content.split('\n');
                const headers = lines[0].split(',').map(h => h.trim());
                
                for(let i=1; i<lines.length; i++) {
                    if (!lines[i].trim()) continue;
                    const row = lines[i].split(',');
                    const obj: any = {};
                    headers.forEach((h, index) => {
                        let val: string | number | undefined = row[index]?.trim();
                        // Try parsing number
                        if (val !== undefined && !isNaN(Number(val)) && val !== '') {
                            val = Number(val);
                        }
                        obj[h] = val;
                    });
                    dataToImport.push(obj);
                }
            } else if (file.name.endsWith('.json')) {
                dataToImport = JSON.parse(content);
                if (!Array.isArray(dataToImport)) throw new Error("JSON must be an array of objects");
            }

            const updateCollection = (collection: GeoCollection) => {
                const newFeatures = collection.features.map(feature => {
                    const match = dataToImport.find(d => d.geocode === feature.properties.geocode);
                    if (match) {
                        return {
                            ...feature,
                            properties: { ...feature.properties, ...match }
                        };
                    }
                    return feature;
                });
                return { ...collection, features: newFeatures };
            };

            setDistricts(prev => updateCollection(prev));
            setTaluks(prev => updateCollection(prev));
            setVillages(prev => updateCollection(prev));
            setPincodes(prev => updateCollection(prev));

            alert(`Successfully imported ${dataToImport.length} records. Data mapped by 'geocode'.`);

        } catch (err) {
            console.error(err);
            alert("Failed to parse file. Ensure it is a valid CSV or JSON array with a 'geocode' column.");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
  };
  
  const handleLayerExport = (layerName: string) => {
      if (!layerName) return;

      let features: GeoFeature[] = [];
      let filename = 'export.csv';

      switch(layerName) {
          case 'ALL':
              features = [
                  ...districts.features,
                  ...taluks.features,
                  ...villages.features,
                  ...pincodes.features,
                  ...stores // Include stores in full export
              ];
              filename = 'bengaluru_gis_full_data.csv';
              break;
          case 'STORES':
              features = stores;
              filename = 'retail_stores.csv';
              break;
          case 'DISTRICTS':
              features = districts.features;
              filename = 'bengaluru_districts.csv';
              break;
          case 'TALUKS':
              features = taluks.features;
              filename = 'bengaluru_taluks.csv';
              break;
          case 'VILLAGES':
              features = villages.features;
              filename = 'bengaluru_villages.csv';
              break;
          case 'PINCODES':
              features = pincodes.features;
              filename = 'bengaluru_pincodes.csv';
              break;
          default:
              return;
      }

      const csvContent = convertToCSV(features);
      const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Helper for Rating Stars in Filter
  const RatingStars = ({ count }: { count: number }) => (
    <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
            <Star key={i} className={`w-3 h-3 ${i < Math.floor(count) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'} ${i === Math.floor(count) && count % 1 !== 0 ? 'fill-yellow-400 text-yellow-400 opacity-50' : ''}`} />
        ))}
        <span className="ml-1 text-[10px] font-medium">{count}+</span>
    </div>
  );

  return (
    <div className="h-screen w-screen bg-slate-100 flex flex-col overflow-hidden">
      {/* Hidden Input for Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".csv,.json" 
        className="hidden" 
      />

      {/* Header - Dark Professional Theme */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between z-20 shadow-xl shrink-0 text-white relative">
        
        {/* Abstract Background Effect */}
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500 rounded-full blur-3xl"></div>
            <div className="absolute top-0 right-0 w-60 h-60 bg-purple-500 rounded-full blur-3xl opacity-50"></div>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-500 via-sky-500 to-indigo-600 rounded-full opacity-70 blur-sm group-hover:opacity-100 transition duration-700"></div>
            <div className="relative flex items-center justify-center w-11 h-11 bg-slate-950 rounded-full border border-slate-700/50 shadow-2xl z-10 backdrop-blur-sm group-hover:border-slate-600 transition-all">
               <Globe className="w-6 h-6 text-slate-300 group-hover:text-sky-300 transition-colors duration-500" strokeWidth={1.5} />
               <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" strokeWidth={2.5} />
               </div>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-black tracking-widest text-white flex items-center gap-2 font-sans">
              BENGALURU <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">GEOPULSE</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase flex items-center gap-1.5 ml-0.5">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
               Spatial Intelligence Platform
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative z-10">
           {/* Retail Scan Control */}
           <div className="hidden xl:flex items-center gap-2 mr-4 bg-slate-800 p-1 rounded-lg border border-slate-700">
               <div className="px-2 text-xs font-bold text-emerald-400 uppercase flex items-center gap-1">
                   <ShoppingBag className="w-3 h-3" /> Retail Scan
               </div>
               
               {/* Custom Region Selector */}
               <div className="relative" ref={regionMenuRef}>
                   <button 
                       onClick={() => setIsRegionMenuOpen(!isRegionMenuOpen)}
                       className="flex items-center justify-between gap-2 bg-slate-700 text-white text-xs py-1.5 px-3 rounded border border-slate-600 hover:bg-slate-600 hover:border-slate-500 transition-all w-40"
                   >
                       <span className="truncate">
                           {selectedRegionIndices.size === 0 
                              ? "Select a Region"
                              : selectedRegionIndices.size === 1 
                                ? scanRegions.find((_,i) => selectedRegionIndices.has(i))?.name 
                                : `${selectedRegionIndices.size} Regions Selected`}
                       </span>
                       <ChevronDown className={`w-3 h-3 transition-transform ${isRegionMenuOpen ? 'rotate-180' : ''}`} />
                   </button>
                   
                   {/* Dropdown Menu */}
                   {isRegionMenuOpen && (
                       <div className="absolute top-full mt-2 left-0 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                           <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
                               {['Bengaluru Urban', 'Bengaluru Rural'].map(group => (
                                   <div key={group}>
                                       <div className="bg-slate-900/50 px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                                           {group}
                                       </div>
                                       {scanRegions.map((r, idx) => {
                                           if (r.group !== group) return null;
                                           const isSelected = selectedRegionIndices.has(idx);
                                           return (
                                               <div 
                                                 key={idx} 
                                                 onClick={() => toggleRegion(idx)}
                                                 className="flex items-center gap-3 px-3 py-2 hover:bg-slate-700 cursor-pointer text-xs text-slate-200 transition-colors border-b border-slate-700/50 last:border-0"
                                               >
                                                   {isSelected 
                                                     ? <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" /> 
                                                     : <Square className="w-4 h-4 text-slate-500 shrink-0" />}
                                                   <span className={isSelected ? 'font-medium text-white' : ''}>{r.name}</span>
                                               </div>
                                           );
                                       })}
                                   </div>
                               ))}
                           </div>
                           <div className="bg-slate-900 p-2 text-center text-[10px] text-slate-500 border-t border-slate-700">
                               Select multiple regions to scan
                           </div>
                       </div>
                   )}
               </div>

               <button 
                   onClick={handleScanStores}
                   disabled={isScanning}
                   className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-all ${isScanning ? 'bg-slate-700 text-slate-300 cursor-not-allowed w-44 justify-center' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50'}`}
               >
                   {isScanning ? (
                       <div className="w-full flex flex-col items-center justify-center gap-0.5">
                           <div className="flex items-center justify-between w-full">
                              <span className="text-[9px] truncate max-w-[80px]">{scanProgress}</span>
                              <span className="text-[9px] font-mono">{scanPercentage}%</span>
                           </div>
                           <div className="w-full h-1 bg-slate-600 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-400 transition-all duration-300 ease-linear" 
                                style={{ width: `${scanPercentage}%` }}
                              ></div>
                           </div>
                       </div>
                   ) : (
                       <>Load Stores <Search className="w-3 h-3" /></>
                   )}
               </button>
           </div>
           
           {/* Store Filters Toggle */}
           {stores.length > 0 && (
             <button
               onClick={() => {
                 setShowFilterBar(true);
                 if (showFilterBar && !isFilterCollapsed) setIsFilterCollapsed(true);
                 else setIsFilterCollapsed(false);
               }}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${showFilterBar && !isFilterCollapsed ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
             >
               <Filter className="w-3.5 h-3.5" />
               Filters
               {(selectedCategories.size > 0 || selectedRatings.size > 0) && <span className="bg-indigo-400 text-indigo-900 px-1.5 rounded-full text-[9px]">{selectedCategories.size + selectedRatings.size}</span>}
             </button>
           )}

           <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-800/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-700 mr-2">
              <Layers className="w-3.5 h-3.5" />
              <span>Multi-Layer Active</span>
           </div>
           
           <button 
             onClick={handleImportClick}
             className="flex items-center gap-2 bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-700 hover:text-white transition-all shadow-sm"
           >
             <Upload className="w-3.5 h-3.5" />
             Import
           </button>
           
           <div className="relative flex items-center group">
             <select 
               onChange={(e) => {
                   handleLayerExport(e.target.value);
                   e.target.value = ""; // Reset
               }}
               className="pl-9 pr-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-all shadow-md shadow-indigo-900/20 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 border border-indigo-500"
               defaultValue=""
             >
                 <option value="" disabled>Export Data</option>
                 <option value="ALL">Full Dataset (CSV)</option>
                 <option value="STORES">Retail Stores Only</option>
                 <option value="DISTRICTS">Districts</option>
                 <option value="TALUKS">Taluks</option>
                 <option value="VILLAGES">Villages</option>
                 <option value="PINCODES">Pincodes</option>
             </select>
             <Download className="w-3.5 h-3.5 text-indigo-200 absolute left-3 pointer-events-none group-hover:text-white" />
           </div>
        </div>
      </header>

      {/* FILTER BAR - Multi Select */}
      {showFilterBar && stores.length > 0 && (
          <div className={`bg-white border-b border-slate-200 px-6 py-2 flex flex-col shadow-sm z-10 transition-all duration-300 ease-in-out ${isFilterCollapsed ? 'max-h-[40px] overflow-hidden' : 'max-h-[40vh] overflow-y-auto'}`}>
              
              <div className="flex justify-between items-start md:items-center">
                 {/* Collapse Controls (Only visible in header when collapsed) */}
                 {isFilterCollapsed && (
                     <div className="flex items-center gap-4 text-xs font-medium text-slate-500 w-full">
                         <div className="flex items-center gap-2">
                             <Filter className="w-3.5 h-3.5" /> 
                             <span className="font-bold">Active Filters:</span> 
                             {selectedCategories.size === 0 && selectedRatings.size === 0 ? 'None' : (
                                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{selectedCategories.size + selectedRatings.size} selected</span>
                             )}
                         </div>
                         <div className="flex-1"></div>
                         <button onClick={() => setIsFilterCollapsed(false)} className="text-slate-400 hover:text-slate-600 flex items-center gap-1">
                             Show Details <ChevronDown className="w-3 h-3" />
                         </button>
                     </div>
                 )}
              </div>

              {!isFilterCollapsed && (
              <div className="flex flex-col md:flex-row md:items-start gap-4 animate-in slide-in-from-top-1 duration-200 pt-1">
                {/* Categories */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <Filter className="w-3 h-3" /> Categories:
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {availableCategories.map(cat => {
                            const isSelected = selectedCategories.has(cat);
                            return (
                                <button
                                    key={cat}
                                    onClick={() => toggleCategory(cat)}
                                    className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'}`}
                                >
                                    {isSelected && <Check className="w-3 h-3" />}
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Rating Filter */}
                <div className="shrink-0 md:border-l md:border-slate-200 md:pl-4 min-w-[200px]">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <Star className="w-3 h-3" /> Ratings:
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[3, 4, 4.5].map(stars => {
                            const isSelected = selectedRatings.has(stars);
                            return (
                                <button 
                                    key={stars}
                                    onClick={() => toggleRating(stars)}
                                    className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-all ${isSelected ? 'bg-amber-400 text-amber-950 border-amber-400 font-bold shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'}`}
                                >
                                        {isSelected && <Check className="w-3 h-3" />}
                                    <RatingStars count={stars} />
                                </button>
                            )
                        })}
                    </div>
                    <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
                            {(selectedCategories.size > 0 || selectedRatings.size > 0) && (
                                <button onClick={clearFilters} className="text-red-500 hover:underline">Clear Filters</button>
                            )}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2 ml-auto">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsFilterCollapsed(true)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded" title="Collapse Filters">
                             <ChevronUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowFilterBar(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded" title="Close Filters">
                             <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="text-xs font-medium text-slate-400 whitespace-nowrap mt-auto">
                        Showing <strong className="text-slate-800">{filteredStores.length}</strong> of {stores.length}
                    </div>
                </div>
              </div>
              )}
          </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden relative">
        
        {/* Map Container */}
        <div className="flex-1 h-full min-h-[500px] relative z-0 bg-slate-200 rounded-xl overflow-hidden shadow-sm border border-slate-300/50">
           <MapViewer 
             onFeatureHover={handleFeatureHover}
             onFeatureSelect={handleFeatureSelect}
             selectedFeature={selectedFeature}
             districts={districts}
             taluks={taluks}
             villages={villages}
             pincodes={pincodes}
             stores={filteredStores}
           />
        </div>

        {/* Sidebar / Info Panel (Reduced Width) */}
        <aside className="w-full md:w-80 lg:w-[320px] shrink-0 h-[40vh] md:h-full z-10">
          <InfoPanel feature={selectedFeature} />
        </aside>

      </main>
    </div>
  );
};

export default App;