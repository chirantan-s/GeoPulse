import React from 'react';
import { GeoFeature } from '../types';
import { 
  Info, MapPin, Users, BookOpen, Train, Plane, Navigation, Ruler, Map, Layers, Building2,
  Droplets, Zap, Bus, School, Stethoscope, Tractor, Mail, Home, ShoppingBag, Download, Hash, Star, Activity, Phone, Globe, Clock
} from 'lucide-react';

interface InfoPanelProps {
  feature: GeoFeature | null;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ feature }) => {
  const data = feature?.properties || null;

  const handleExport = () => {
    if (!feature || !data) return;
    
    const headers = [...Object.keys(data), 'geometry'];
    const values = headers.map(header => {
      if (header === 'geometry') {
          return `"${JSON.stringify(feature.geometry).replace(/"/g, '""')}"`;
      }
      let val = data[header];
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
    }).join(',');
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + values;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${data.geocode}_${data.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStars = (rating?: number) => {
    if (rating === undefined || rating === null) {
        return <span className="text-xs text-slate-400 italic">No ratings available</span>;
    }
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`w-3.5 h-3.5 ${i < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} 
          />
        ))}
        <span className="ml-1.5 text-sm font-bold text-slate-700">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (!data) {
    return (
      <div className="bg-white/80 backdrop-blur-md p-8 rounded-xl shadow-lg border border-slate-200 h-full flex flex-col items-center justify-center text-center text-slate-500">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
            <MapPin className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Select a Region</h3>
        <p className="text-sm mt-2 max-w-[250px] leading-relaxed">Hover over map layers or click on Districts, Taluks, Villages, or Stores to view detailed analytics.</p>
      </div>
    );
  }

  // --- REFINED COLOR LOGIC TO MATCH MAP ---
  const literacyRate = data.literacyRate ?? 0;
  const literacyColor = literacyRate > 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : literacyRate > 70 ? 'text-blue-700 bg-blue-50 border-blue-100' : 'text-orange-700 bg-orange-50 border-orange-100';
  const progressBarColor = literacyRate > 80 ? 'bg-emerald-500' : literacyRate > 70 ? 'bg-blue-500' : 'bg-orange-500';

  // Badge color based on type - MATCHING MAP LAYERS
  const typeColors = {
      'District': 'bg-slate-800 text-white border-slate-700',
      'Taluk': 'bg-blue-100 text-blue-800 border-blue-200', // Matches Blue Map Layer
      'Village': 'bg-orange-100 text-orange-800 border-orange-200', // Matches Warm Map Layer
      'Pincode': 'bg-purple-100 text-purple-800 border-purple-200', // Matches Purple Map Layer
      'Store': 'bg-red-100 text-red-800 border-red-200' // Matches Red Store Layer
  };
  
  const iconColors = {
      'District': 'text-slate-600',
      'Taluk': 'text-blue-600',
      'Village': 'text-orange-600',
      'Pincode': 'text-purple-600',
      'Store': 'text-red-600'
  }

  return (
    <div className="bg-white/95 backdrop-blur-md p-6 rounded-xl shadow-xl border border-slate-200 h-full animate-in slide-in-from-right duration-300 overflow-y-auto flex flex-col">
      
      {/* Header Section */}
      <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-100">
        <div className={`p-3 rounded-xl mt-1 shadow-sm ${data.type === 'District' ? 'bg-slate-100' : data.type === 'Taluk' ? 'bg-blue-50' : data.type === 'Village' ? 'bg-orange-50' : data.type === 'Store' ? 'bg-red-50' : 'bg-purple-50'}`}>
          {data.type === 'District' ? <Building2 className={`w-8 h-8 ${iconColors[data.type]}`} /> :
           data.type === 'Taluk' ? <Map className={`w-8 h-8 ${iconColors[data.type]}`} /> : 
           data.type === 'Pincode' ? <Layers className={`w-8 h-8 ${iconColors[data.type]}`} /> :
           data.type === 'Store' ? <ShoppingBag className={`w-8 h-8 ${iconColors[data.type]}`} /> :
           <MapPin className={`w-8 h-8 ${iconColors[data.type]}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-md mb-2 border inline-block shadow-sm ${typeColors[data.type]}`}>
                {data.type}
              </span>
              <div className="flex items-center gap-1.5 text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                 <Hash className="w-3 h-3" />
                 <span className="text-xs font-mono font-semibold">{data.geocode}</span>
              </div>
          </div>
          
          <h2 className="text-3xl font-extrabold text-slate-900 leading-tight truncate" title={data.name}>{data.name}</h2>
          
          {/* Breadcrumbs */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-slate-500">
            {data.type === 'Store' && (
               <span className="flex items-center gap-1 text-slate-600">
                  <MapPin className="w-3 h-3"/> {data.vicinity || 'Bengaluru'}
               </span>
            )}
            {data.district && data.type !== 'District' && data.type !== 'Store' && (
                <span className="font-medium hover:text-slate-800 transition-colors">{data.district}</span>
            )}
            {data.taluk && (
                 <>
                    <span className="text-slate-300">/</span>
                    <span className="font-medium hover:text-slate-800 transition-colors">{data.taluk}</span>
                 </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* --- RETAIL STORE SPECIFIC --- */}
        {data.type === 'Store' && (
             <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 shadow-sm">
                <h3 className="text-[11px] font-extrabold text-red-800/60 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Activity className="w-3 h-3" /> Store Analytics
                </h3>
                
                <div className="mb-4">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Category</p>
                    <div className="flex gap-2">
                        <span className="text-sm font-bold text-slate-800 bg-white border border-slate-200 px-2 py-1 rounded">{data.category}</span>
                        <span className="text-sm font-medium text-slate-600 bg-slate-50 border border-slate-100 px-2 py-1 rounded">{data.subCategory}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                   <div className="bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Customer Rating</p>
                      {renderStars(data.rating)}
                   </div>
                   <div className="bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Reviews</p>
                      <p className="text-lg font-bold text-slate-800">{data.userRatingsTotal ? data.userRatingsTotal.toLocaleString() : '-'}</p>
                   </div>
                </div>

                {/* Contact Info (If Available) */}
                <div className="space-y-2 bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                     {data.phone && (
                         <div className="flex items-center gap-2 text-sm text-slate-700">
                             <Phone className="w-3.5 h-3.5 text-slate-400"/>
                             <a href={`tel:${data.phone}`} className="hover:underline">{data.phone}</a>
                         </div>
                     )}
                     {data.website && (
                         <div className="flex items-center gap-2 text-sm text-slate-700">
                             <Globe className="w-3.5 h-3.5 text-slate-400"/>
                             <a href={data.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[200px]">{data.website}</a>
                         </div>
                     )}
                     {data.openingHours && (
                         <div className="flex items-start gap-2 text-sm text-slate-700">
                             <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5"/>
                             <span className="text-xs leading-tight">{data.openingHours}</span>
                         </div>
                     )}
                     {!data.phone && !data.website && !data.openingHours && (
                         <span className="text-xs text-slate-400 italic">No contact info available</span>
                     )}
                </div>
             </div>
        )}


        {/* Key Metrics Row */}
        {(data.population !== undefined || data.areaSqKm !== undefined) && (
        <div className="grid grid-cols-2 gap-4">
             {data.population !== undefined ? (
               <div className="flex flex-col gap-1 p-4 rounded-xl bg-slate-50 border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-slate-200">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Population</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{data.population.toLocaleString()}</p>
               </div>
             ) : null}

             {data.areaSqKm !== undefined && (
               <div className="flex flex-col gap-1 p-4 rounded-xl bg-slate-50 border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-slate-200">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Ruler className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Area</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{data.areaSqKm.toFixed(1)} <span className="text-sm font-medium text-slate-400">km²</span></p>
               </div>
             )}
        </div>
        )}

        {/* Literacy Progress */}
        {data.literacyRate !== undefined && (
          <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Literacy Rate</span>
                </div>
                <span className={`text-sm font-bold px-2 py-0.5 rounded border ${literacyColor}`}>{data.literacyRate.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${progressBarColor} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${data.literacyRate}%` }}></div>
            </div>
          </div>
        )}

        {/* Admin Stats Grid */}
        {(data.sexRatio || data.numTaluks || data.numVillages || data.householdCount) && (
            <div>
                <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Demographics & Admin</h3>
                <div className="grid grid-cols-2 gap-3">
                    {data.sexRatio && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Sex Ratio</span>
                            <span className="font-bold text-slate-700">{data.sexRatio} <span className="text-[10px] font-normal text-slate-400">/ 1000 M</span></span>
                        </div>
                    )}
                    {data.householdCount && (
                         <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Households</span>
                            <span className="font-bold text-slate-700">{data.householdCount.toLocaleString()}</span>
                        </div>
                    )}
                    {data.numTaluks && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Taluks</span>
                            <span className="font-bold text-slate-700">{data.numTaluks}</span>
                        </div>
                    )}
                    {data.numVillages && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Villages</span>
                            <span className="font-bold text-slate-700">{data.numVillages}</span>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Infrastructure List */}
        {(data.waterSource || data.roadCondition || data.busFrequency || data.postOfficeStatus) && (
             <div>
                <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Infrastructure</h3>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-sm">
                    {data.waterSource && (
                        <div className="p-3 flex items-center gap-3">
                            <div className="bg-cyan-50 text-cyan-600 p-2 rounded-lg"><Droplets className="w-4 h-4"/></div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-semibold">Water Source</p>
                                <p className="text-sm font-medium text-slate-700">{data.waterSource}</p>
                            </div>
                        </div>
                    )}
                    {data.roadCondition && (
                        <div className="p-3 flex items-center gap-3">
                            <div className="bg-stone-50 text-stone-600 p-2 rounded-lg"><Navigation className="w-4 h-4"/></div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-semibold">Road Access</p>
                                <p className="text-sm font-medium text-slate-700">{data.roadCondition}</p>
                            </div>
                        </div>
                    )}
                    {data.busFrequency && (
                        <div className="p-3 flex items-center gap-3">
                            <div className="bg-rose-50 text-rose-600 p-2 rounded-lg"><Bus className="w-4 h-4"/></div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-semibold">Transport</p>
                                <p className="text-sm font-medium text-slate-700">{data.busFrequency}</p>
                            </div>
                        </div>
                    )}
                     {data.postOfficeStatus && (
                        <div className="p-3 flex items-center gap-3">
                            <div className="bg-violet-50 text-violet-600 p-2 rounded-lg"><Mail className="w-4 h-4"/></div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-semibold">Postal Service</p>
                                {data.postOfficeName && <p className="text-sm font-bold text-slate-800">{data.postOfficeName}</p>}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500">{data.postOfficeStatus}</span>
                                  {data.deliveryStatus && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-px rounded-full uppercase tracking-wide font-bold">{data.deliveryStatus}</span>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
             </div>
        )}

         {/* Services */}
         {(data.schoolCount !== undefined || data.hospitalCount !== undefined) && (
            <div>
                 <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Public Services</h3>
                 <div className="flex gap-3">
                    {data.schoolCount !== undefined && (
                        <div className="flex-1 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100 flex flex-col items-center justify-center text-center shadow-sm">
                            <School className="w-6 h-6 text-amber-600 mb-2"/>
                            <span className="text-2xl font-bold text-slate-800">{data.schoolCount}</span>
                            <span className="text-[10px] text-amber-700/60 uppercase font-bold tracking-wider">Schools</span>
                        </div>
                    )}
                    {data.hospitalCount !== undefined && (
                        <div className="flex-1 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100 flex flex-col items-center justify-center text-center shadow-sm">
                            <Stethoscope className="w-6 h-6 text-emerald-600 mb-2"/>
                            <span className="text-2xl font-bold text-slate-800">{data.hospitalCount}</span>
                             <span className="text-[10px] text-emerald-700/60 uppercase font-bold tracking-wider">Hospitals</span>
                        </div>
                    )}
                 </div>
            </div>
         )}
         
         {/* Economic Data */}
         {(data.mainCrops || data.economicFocus || data.keyMarkets) && (
             <div>
                 <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Economy</h3>
                 <div className="bg-lime-50/50 rounded-xl p-4 border border-lime-100">
                     {data.economicFocus && (
                         <div className="mb-4">
                             <p className="text-[10px] text-lime-800/60 uppercase font-bold mb-1">Primary Focus</p>
                             <p className="text-sm font-semibold text-slate-800">{data.economicFocus}</p>
                         </div>
                     )}
                     
                     {data.keyMarkets && data.keyMarkets.length > 0 && (
                         <div className="mb-4">
                             <p className="text-[10px] text-lime-800/60 uppercase font-bold mb-2 flex items-center gap-1"><ShoppingBag className="w-3 h-3"/> Commercial Hubs</p>
                             <div className="flex flex-wrap gap-1.5">
                                 {data.keyMarkets.map((market, i) => (
                                     <span key={i} className="text-xs bg-white border border-lime-200 text-slate-700 px-2.5 py-1 rounded-md shadow-sm font-medium">
                                         {market}
                                     </span>
                                 ))}
                             </div>
                         </div>
                     )}

                     {data.mainCrops && data.mainCrops.length > 0 && (
                         <div>
                             <p className="text-[10px] text-lime-800/60 uppercase font-bold mb-2 flex items-center gap-1"><Tractor className="w-3 h-3"/> Agriculture</p>
                             <div className="flex flex-wrap gap-1.5">
                                 {data.mainCrops.map((crop, i) => (
                                     <span key={i} className="text-xs bg-lime-100 border border-lime-200 text-lime-800 px-2.5 py-1 rounded-md font-medium">
                                         {crop}
                                     </span>
                                 ))}
                             </div>
                         </div>
                     )}
                 </div>
             </div>
         )}

        {/* Distance Matrix */}
        <div className="pt-2">
           <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Connectivity Matrix</h3>
           <div className="space-y-2">
             {data.nearestCity && data.distanceToCityKm !== undefined && (
               <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded">
                     <Navigation className="w-4 h-4" />
                   </div>
                   <div>
                     <p className="text-[10px] text-slate-400 uppercase font-semibold">City Center</p>
                     <p className="font-semibold text-slate-700 text-sm">{data.nearestCity}</p>
                   </div>
                 </div>
                 <span className="text-sm font-bold text-slate-800 font-mono">{data.distanceToCityKm.toFixed(1)} km</span>
               </div>
             )}
             
             {data.nearestRailway && data.distanceToRailwayKm !== undefined && (
               <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="p-1.5 bg-orange-50 text-orange-600 rounded">
                     <Train className="w-4 h-4" />
                   </div>
                   <div>
                     <p className="text-[10px] text-slate-400 uppercase font-semibold">Railway Stn</p>
                     <p className="font-semibold text-slate-700 text-sm max-w-[120px] truncate" title={data.nearestRailway}>{data.nearestRailway}</p>
                   </div>
                 </div>
                 <span className="text-sm font-bold text-slate-800 font-mono">{data.distanceToRailwayKm.toFixed(1)} km</span>
               </div>
             )}

              {data.nearestAirport && data.distanceToAirportKm !== undefined && (
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="p-1.5 bg-sky-50 text-sky-600 rounded">
                     <Plane className="w-4 h-4" />
                   </div>
                   <div>
                     <p className="text-[10px] text-slate-400 uppercase font-semibold">Intl Airport</p>
                     <p className="font-semibold text-slate-700 text-sm max-w-[120px] truncate" title={data.nearestAirport}>{data.nearestAirport}</p>
                   </div>
                 </div>
                 <span className="text-sm font-bold text-slate-800 font-mono">{data.distanceToAirportKm.toFixed(1)} km</span>
               </div>
              )}
           </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-auto pt-6 border-t border-slate-100">
           <button 
                onClick={handleExport}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
            >
                <Download className="w-5 h-5" />
                <span>Download Regional Data (CSV)</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;