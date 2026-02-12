import React, { useState, useRef } from 'react';
import MapViewer from './components/MapViewer';
import InfoPanel from './components/InfoPanel';
import { GeoMetadata, GeoCollection, GeoFeature } from './types';
import { Map as MapIcon, Layers, Upload, Download, Activity, Globe } from 'lucide-react';
import { districtsData, taluksData, villagesData, pincodesData } from './data/geoData';

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFeatureSelect = (data: GeoFeature) => {
    setSelectedFeature(data);
  };
  
  const handleFeatureHover = (data: GeoMetadata | null) => {
      // Hover logic handled internally
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

            // Map imported data to existing features via geocode
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
                  ...pincodes.features
              ];
              filename = 'bengaluru_gis_full_data.csv';
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
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between z-20 shadow-xl shrink-0 text-white relative overflow-hidden">
        
        {/* Abstract Background Effect */}
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500 rounded-full blur-3xl"></div>
            <div className="absolute top-0 right-0 w-60 h-60 bg-purple-500 rounded-full blur-3xl opacity-50"></div>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          {/* Logo: Globe with Pulse */}
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full opacity-40 blur-md group-hover:opacity-75 transition duration-500"></div>
            <div className="relative flex items-center justify-center w-11 h-11 bg-slate-950 rounded-full border border-slate-800/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.6)]">
               <Globe className="w-7 h-7 text-slate-600 group-hover:text-indigo-400 transition-colors duration-500" strokeWidth={1} />
               <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" strokeWidth={2.5} />
               </div>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-black tracking-widest text-white flex items-center gap-2 font-sans">
              BENGALURU <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">GEOPULSE</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase flex items-center gap-1.5 ml-0.5">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
               Spatial Intelligence Platform
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative z-10">
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
                 <option value="DISTRICTS">Districts</option>
                 <option value="TALUKS">Taluks</option>
                 <option value="VILLAGES">Villages</option>
                 <option value="PINCODES">Pincodes</option>
             </select>
             <Download className="w-3.5 h-3.5 text-indigo-200 absolute left-3 pointer-events-none group-hover:text-white" />
           </div>
        </div>
      </header>

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