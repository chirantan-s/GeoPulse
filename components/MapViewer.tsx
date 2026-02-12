import React, { useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap, Pane } from 'react-leaflet';
import L from 'leaflet';
import { Target } from 'lucide-react';
// CSS is loaded in index.html
import { GeoFeature, GeoMetadata, GeoCollection } from '../types';

// --- Fix Leaflet Marker Icons ---
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

try {
  if ((L.Icon.Default.prototype as any)._getIconUrl) {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
  }
} catch (e) {
  console.warn("Could not delete _getIconUrl", e);
}

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

interface MapViewerProps {
  onFeatureHover: (data: GeoMetadata | null) => void;
  onFeatureSelect: (data: GeoFeature) => void;
  selectedFeature: GeoFeature | null;
  districts: GeoCollection;
  taluks: GeoCollection;
  villages: GeoCollection;
  pincodes: GeoCollection;
}

// Define default center
const DEFAULT_CENTER: [number, number] = [13.15, 77.60];
const DEFAULT_ZOOM = 10;

const MapController: React.FC<{center: [number, number], zoom: number}> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && !isNaN(center[0]) && !isNaN(center[1])) {
        try {
          map.flyTo(center, zoom, { duration: 1.5 });
        } catch (e) {
          console.error("Map flyTo error:", e);
        }
    }
  }, [center, zoom, map]);
  return null;
}

// --- Recenter Control Component ---
const RecenterControl = () => {
  const map = useMap();
  
  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control leaflet-bar !border-none !shadow-md mt-3 mr-3">
         <button 
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1.5 });
            }}
            className="bg-white hover:bg-slate-50 text-slate-700 w-8 h-8 rounded-md shadow-sm border border-slate-300 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Recenter Map"
         >
            <Target className="w-4 h-4" />
         </button>
      </div>
    </div>
  );
};

const MapViewer: React.FC<MapViewerProps> = ({ 
    onFeatureHover, 
    onFeatureSelect, 
    selectedFeature,
    districts,
    taluks,
    villages,
    pincodes
}) => {
  
  const selectedFeatureRef = useRef(selectedFeature);
  
  // Use a callback ref to strictly enforce event propagation stopping on mount
  const setLegendRef = useCallback((element: HTMLDivElement | null) => {
    if (element) {
        L.DomEvent.disableScrollPropagation(element);
        L.DomEvent.disableClickPropagation(element);
    }
  }, []);

  useEffect(() => {
    selectedFeatureRef.current = selectedFeature;
  }, [selectedFeature]);

  const districtsRef = useRef<L.GeoJSON>(null);
  const taluksRef = useRef<L.GeoJSON>(null);
  const villagesRef = useRef<L.GeoJSON>(null);
  const pincodesRef = useRef<L.GeoJSON>(null);

  const isSelected = (props: GeoMetadata) => {
    const selected = selectedFeatureRef.current;
    if (!selected) return false;
    return selected.properties.id === props.id;
  }

  // --- REFINED STYLES ---

  // District: Rural (Emerald) vs Urban (Slate)
  const districtStyle = (feature: any) => {
    const selected = isSelected(feature.properties);
    const name = feature.properties.name;
    const isRural = name === 'Bengaluru Rural';
    
    return {
      fillColor: isRural ? '#10b981' : '#64748b', 
      weight: selected ? 3 : 2, 
      opacity: 1,
      color: selected ? '#0ea5e9' : (isRural ? '#047857' : '#334155'), 
      fillOpacity: selected ? 0.2 : 0.05, 
      dashArray: selected ? '5, 5' : '10, 5' 
    };
  };

  // Taluks: Blue Monochromatic Scale (Literacy)
  const talukStyle = (feature: any) => {
    const selected = isSelected(feature.properties);
    const literacy = feature?.properties?.literacyRate || 0;
    
    let color = '#eff6ff'; // blue-50
    if (literacy > 85) color = '#1e3a8a'; 
    else if (literacy > 82) color = '#2563eb'; 
    else if (literacy > 78) color = '#60a5fa'; 
    else if (literacy > 75) color = '#93c5fd'; 
    else color = '#bfdbfe'; 

    return {
      fillColor: color,
      weight: selected ? 3 : 1,
      opacity: 1,
      color: selected ? '#facc15' : '#fff', 
      fillOpacity: selected ? 0.8 : 0.65
    };
  };

  // Villages: Warm Scale (Population)
  const villageStyle = (feature: any) => {
    const selected = isSelected(feature.properties);
    const pop = feature?.properties?.population || 0;
    
    let color = '#fff7ed'; 
    if (pop > 3500) color = '#7f1d1d'; // red-900
    else if (pop > 2000) color = '#c2410c'; // orange-700
    else if (pop > 1000) color = '#d97706'; // amber-600
    else color = '#fcd34d'; // amber-300
    
    if (feature?.properties?.population === undefined) {
        color = '#e5e7eb'; 
    }
    
    return {
      fillColor: selected ? '#06b6d4' : color, 
      weight: selected ? 2 : 0.5,
      opacity: 1,
      color: selected ? '#0891b2' : '#78350f', 
      fillOpacity: selected ? 0.9 : 0.75
    };
  };

  // Pincodes: Purple Overlay
  const pincodeStyle = (feature: any) => {
    const selected = isSelected(feature.properties);
    return {
      fillColor: selected ? '#d8b4fe' : 'transparent',
      weight: selected ? 3 : 1.5,
      opacity: 1,
      color: selected ? '#7e22ce' : '#9333ea', 
      dashArray: '4, 4', 
      fillOpacity: selected ? 0.4 : 0
    };
  };

  useEffect(() => {
    if (districtsRef.current) districtsRef.current.setStyle(districtStyle);
    if (taluksRef.current) taluksRef.current.setStyle(talukStyle);
    if (villagesRef.current) villagesRef.current.setStyle(villageStyle);
    if (pincodesRef.current) pincodesRef.current.setStyle(pincodeStyle);
  }, [selectedFeature]);

  const onEachFeature = (feature: GeoFeature, layer: L.Layer) => {
    const p = feature.properties;
    let tooltipContent = '';

    if (p.type === 'District') {
        tooltipContent = `<div class="font-sans px-1"><div class="font-bold text-slate-800">${p.name}</div><div class="text-xs text-slate-500 uppercase tracking-wider">District</div></div>`;
    } else if (p.type === 'Taluk') {
        tooltipContent = `<div class="font-sans px-1"><div class="font-bold text-blue-900">${p.name}</div><div class="text-xs text-slate-500 uppercase tracking-wider">Taluk</div><div class="text-xs font-mono mt-0.5">Lit: ${p.literacyRate?.toFixed(1)}%</div></div>`;
    } else if (p.type === 'Village') {
        tooltipContent = `<div class="font-sans px-1"><div class="font-bold text-orange-900">${p.name}</div><div class="text-xs text-slate-500 uppercase tracking-wider">Village</div><div class="text-xs font-mono mt-0.5">Pop: ${p.population}</div></div>`;
    } else if (p.type === 'Pincode') {
        tooltipContent = `<div class="font-sans px-1"><div class="font-bold text-purple-900">${p.code || p.name}</div><div class="text-xs text-slate-500 uppercase tracking-wider">Postal Zone</div></div>`;
    }

    if (tooltipContent) {
        layer.bindTooltip(tooltipContent, { sticky: true, className: 'bg-white/95 border border-slate-200 shadow-lg rounded-md px-2 py-1' });
    }

    layer.on({
      mouseover: (e) => {
        const targetLayer = e.target;
        if (!isSelected(feature.properties)) {
            if (targetLayer.setStyle) {
              targetLayer.setStyle({
                weight: 3,
                fillOpacity: 0.8
              });
            }
            // Note: bringToFront() is less critical with Panes but still useful for highlighting within the same pane
            if (targetLayer.bringToFront) {
                targetLayer.bringToFront();
            }
        }
        onFeatureHover(feature.properties);
      },
      mouseout: (e) => {
        const targetLayer = e.target;
        if (targetLayer.setStyle) {
           if (feature.properties.type === 'District') targetLayer.setStyle(districtStyle(feature));
           else if (feature.properties.type === 'Taluk') targetLayer.setStyle(talukStyle(feature));
           else if (feature.properties.type === 'Village') targetLayer.setStyle(villageStyle(feature));
           else if (feature.properties.type === 'Pincode') targetLayer.setStyle(pincodeStyle(feature));
        }
      },
      click: (e) => {
        if (e.originalEvent) {
             L.DomEvent.stopPropagation(e.originalEvent);
             L.DomEvent.preventDefault(e.originalEvent);
        }
        onFeatureSelect(feature);
      }
    });
  };

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 relative bg-slate-50">
      <MapContainer 
        center={DEFAULT_CENTER} 
        zoom={DEFAULT_ZOOM} 
        style={{ height: '100%', width: '100%', minHeight: '500px' }}
        scrollWheelZoom={true}
        zoomControl={false} 
      >
        <MapController center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} />
        <RecenterControl />
        
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Define Panes for Z-Index Management */}
        {/* Lower Z-Index = Bottom Layer */}
        <Pane name="districts-pane" style={{ zIndex: 400 }} />
        <Pane name="taluks-pane" style={{ zIndex: 405 }} />
        <Pane name="pincodes-pane" style={{ zIndex: 410 }} />
        <Pane name="villages-pane" style={{ zIndex: 415 }} />

        <LayersControl position="topleft" collapsed={false}>
          
          <LayersControl.Overlay name="Districts (Context)">
            <GeoJSON 
              key="layer-districts"
              ref={districtsRef}
              data={districts as any} 
              style={districtStyle} 
              pane="districts-pane"
              onEachFeature={onEachFeature as any}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Taluks (Literacy)">
            <GeoJSON 
              key="layer-taluks"
              ref={taluksRef}
              data={taluks as any} 
              style={talukStyle} 
              pane="taluks-pane"
              onEachFeature={onEachFeature as any}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Villages (Population)">
            <GeoJSON 
              key="layer-villages"
              ref={villagesRef}
              data={villages as any} 
              style={villageStyle}
              pane="villages-pane"
              onEachFeature={onEachFeature as any}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Pincodes (Zones)">
            <GeoJSON 
              key="layer-pincodes"
              ref={pincodesRef}
              data={pincodes as any} 
              style={pincodeStyle}
              pane="pincodes-pane"
              onEachFeature={onEachFeature as any}
            />
          </LayersControl.Overlay>

        </LayersControl>

        <div className="leaflet-bottom leaflet-right">
           <div 
             ref={setLegendRef}
             className="bg-white/95 backdrop-blur-md p-4 rounded-lg shadow-xl border border-slate-200 m-4 text-xs pointer-events-auto min-w-[180px] max-h-[50vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
             onWheel={(e) => e.stopPropagation()}
           >
              <div className="mb-4">
                <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wide text-[10px] border-b border-slate-100 pb-1">Taluk Literacy (Blue Scale)</h4>
                <div className="space-y-1">
                    <div className="flex items-center justify-between"><span className="text-slate-600">Very High (>85%)</span> <div className="w-8 h-3 bg-[#1e3a8a] rounded-sm"></div></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">High (82-85%)</span> <div className="w-8 h-3 bg-[#2563eb] rounded-sm"></div></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">Medium (78-82%)</span> <div className="w-8 h-3 bg-[#60a5fa] rounded-sm"></div></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">Low (&lt;78%)</span> <div className="w-8 h-3 bg-[#bfdbfe] rounded-sm"></div></div>
                </div>
              </div>

              <div className="mb-4">
                 <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wide text-[10px] border-b border-slate-100 pb-1">Village Population (Warm)</h4>
                 <div className="space-y-1">
                    <div className="flex items-center justify-between"><span className="text-slate-600">> 3,500</span> <div className="w-8 h-3 bg-[#7f1d1d] rounded-sm"></div></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">2k - 3.5k</span> <div className="w-8 h-3 bg-[#c2410c] rounded-sm"></div></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">1k - 2k</span> <div className="w-8 h-3 bg-[#d97706] rounded-sm"></div></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">&lt; 1k</span> <div className="w-8 h-3 bg-[#fcd34d] rounded-sm"></div></div>
                 </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wide text-[10px] border-b border-slate-100 pb-1">Boundaries</h4>
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-0 border-t-2 border-dashed border-purple-600"></div> 
                    <span className="text-slate-600">Pincode Zone</span>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-4 border-2 border-emerald-600 bg-emerald-100/50 rounded-sm"></div> 
                    <span className="text-slate-600">Bengaluru Rural</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-4 border-2 border-slate-500 bg-slate-200/50 rounded-sm"></div> 
                    <span className="text-slate-600">Bengaluru Urban</span>
                </div>
              </div>
           </div>
        </div>
      </MapContainer>
    </div>
  );
};

export default MapViewer;