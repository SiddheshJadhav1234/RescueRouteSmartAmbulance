import React, { useEffect, useRef, useState } from 'react';
import type { LocationNode, RoadEdge, Ambulance, Hospital, Emergency, RouteResult } from '../types';
import L from 'leaflet';
import { Layers, AlertTriangle, ShieldCheck, MapPin, Zap } from 'lucide-react';

interface MapViewProps {
  locations: LocationNode[];
  roads: RoadEdge[];
  ambulances?: Ambulance[];
  hospitals?: Hospital[];
  emergencies?: Emergency[];
  activeRoute?: RouteResult | null;
  selectedLocationId?: string | null;
  onSelectLocation?: (locationId: string) => void;
  className?: string;
  height?: string;
}

export const MapView: React.FC<MapViewProps> = ({
  locations,
  roads,
  ambulances = [],
  hospitals = [],
  emergencies = [],
  activeRoute = null,
  selectedLocationId = null,
  onSelectLocation,
  className = '',
  height = '500px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const [useSvgFallback, setUseSvgFallback] = useState(false);
  const [tileError, setTileError] = useState(false);

  // Pune center coordinates
  const PUNE_CENTER: [number, number] = [18.558, 73.795];

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    try {
      const map = L.map(mapContainerRef.current, {
        center: PUNE_CENTER,
        zoom: 12,
        zoomControl: true,
        attributionControl: false,
      });

      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      });

      tileLayer.on('tileerror', () => {
        // If tile network fails, flag tile error
        setTileError(true);
      });

      tileLayer.addTo(map);

      const layersGroup = L.layerGroup().addTo(map);
      layersGroupRef.current = layersGroup;
      mapInstanceRef.current = map;

      // Invalidate size after layout settles
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } catch (err) {
      console.warn('[MapView] Leaflet initialization error, falling back to SVG Graph:', err);
      setUseSvgFallback(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map markers, roads, and active route whenever data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const locMap = new Map<string, LocationNode>();
    locations.forEach((l) => locMap.set(l.id, l));

    // 1. Draw Road Network Polylines
    roads.forEach((road) => {
      const source = locMap.get(road.source);
      const target = locMap.get(road.target);
      if (!source || !target) return;

      const latlngs: [number, number][] = [
        [source.lat, source.lng],
        [target.lat, target.lng],
      ];

      const isRoadInActiveRoute =
        activeRoute &&
        activeRoute.steps &&
        activeRoute.steps.some(
          (s) =>
            (s.fromId === road.source && s.toId === road.target) ||
            (s.fromId === road.target && s.toId === road.source)
        );

      if (road.isBlocked) {
        // Red dashed line for blocked roads
        const polyline = L.polyline(latlngs, {
          color: '#DC2626',
          weight: 4,
          dashArray: '8, 8',
          opacity: 0.9,
        }).addTo(group);

        polyline.bindPopup(`
          <div class="text-xs p-1 font-sans">
            <span class="inline-block bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] mb-1">ROAD BLOCKED</span>
            <div class="font-bold text-slate-900">${road.roadName}</div>
            <div class="text-slate-600 mt-1">Status: Closed (Traffic / Obstruction)</div>
            <div class="text-slate-500 text-[10px]">C++ Dijkstra automatically detours around this link.</div>
          </div>
        `);
      } else if (!isRoadInActiveRoute) {
        // Standard navigable road
        const polyline = L.polyline(latlngs, {
          color: '#94A3B8',
          weight: 3,
          opacity: 0.7,
        }).addTo(group);

        polyline.bindPopup(`
          <div class="text-xs p-1 font-sans">
            <div class="font-semibold text-slate-800">${road.roadName}</div>
            <div class="text-slate-500 mt-0.5">Est. Time: <b class="text-slate-800">${road.travelTimeMinutes} min</b> (${road.distanceKm} km)</div>
          </div>
        `);
      }
    });

    // 2. Draw Active C++ Dijkstra Route (Glowing Blue Line)
    if (activeRoute && activeRoute.hasPath && activeRoute.path.length >= 2) {
      const routePoints: [number, number][] = [];
      for (const locId of activeRoute.path) {
        const loc = locMap.get(locId);
        if (loc) {
          routePoints.push([loc.lat, loc.lng]);
        }
      }

      if (routePoints.length >= 2) {
        // Outer glow
        L.polyline(routePoints, {
          color: '#3B82F6',
          weight: 8,
          opacity: 0.35,
        }).addTo(group);

        // Core bright line
        const routePolyline = L.polyline(routePoints, {
          color: '#1D4ED8',
          weight: 5,
          opacity: 0.95,
        }).addTo(group);

        routePolyline.bindPopup(`
          <div class="text-xs p-1 font-sans">
            <span class="inline-block bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px] mb-1">C++ DIJKSTRA SHORTEST PATH</span>
            <div class="font-bold text-slate-900">Total Travel Time: ${activeRoute.totalTravelTimeMinutes} min</div>
            <div class="text-slate-600">Total Distance: ${activeRoute.totalDistanceKm} km</div>
            <div class="text-slate-500 mt-1">Route: ${activeRoute.path.map((id) => locMap.get(id)?.name || id).join(' → ')}</div>
          </div>
        `);

        // Fit bounds to active route
        try {
          map.fitBounds(routePolyline.getBounds(), { padding: [50, 50], maxZoom: 14 });
        } catch (_) {}
      }
    }

    // 3. Draw Locations
    locations.forEach((loc) => {
      const isSelected = selectedLocationId === loc.id;
      const markerHtml = `
        <div class="flex items-center justify-center cursor-pointer transition-transform hover:scale-110">
          <div class="w-6 h-6 rounded-full ${
            isSelected ? 'bg-blue-600 ring-4 ring-blue-300' : 'bg-slate-700'
          } border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold">
            ${loc.name.charAt(0)}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-location-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(group);
      marker.on('click', () => {
        if (onSelectLocation) onSelectLocation(loc.id);
      });

      marker.bindPopup(`
        <div class="text-xs p-1 font-sans">
          <div class="font-bold text-slate-900">${loc.name}</div>
          <div class="text-slate-500 text-[11px]">${loc.zone}</div>
          ${loc.landmark ? `<div class="text-slate-400 text-[10px] mt-0.5">${loc.landmark}</div>` : ''}
        </div>
      `);
    });

    // 4. Draw Hospitals
    hospitals.forEach((hosp) => {
      const loc = locMap.get(hosp.locationId);
      if (!loc) return;

      const hospHtml = `
        <div class="relative cursor-pointer transition-transform hover:scale-110">
          <div class="w-7 h-7 rounded-lg bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white font-extrabold text-xs">
            +
          </div>
          <div class="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center text-[8px] font-bold text-emerald-700 shadow">
            ${hosp.availableBeds}
          </div>
        </div>
      `;

      const hospIcon = L.divIcon({
        html: hospHtml,
        className: 'custom-hosp-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([loc.lat + 0.003, loc.lng + 0.003], { icon: hospIcon }).addTo(group);
      marker.bindPopup(`
        <div class="text-xs p-1 font-sans min-w-[160px]">
          <span class="inline-block bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px] mb-1">HOSPITAL</span>
          <div class="font-bold text-slate-900">${hosp.name}</div>
          <div class="text-slate-600 mt-1">Available Beds: <b class="text-emerald-700">${hosp.availableBeds}</b> / ${hosp.totalBeds}</div>
          <div class="text-slate-600">ICU Units: ${hosp.icuAvailable}</div>
          <div class="text-slate-500 text-[10px] mt-1">Specialties: ${hosp.specialties.join(', ')}</div>
        </div>
      `);
    });

    // 5. Draw Ambulances
    ambulances.forEach((amb) => {
      const loc = locMap.get(amb.currentLocationId);
      if (!loc) return;

      let colorClass = 'bg-emerald-500';
      if (amb.status === 'DISPATCHED' || amb.status === 'EN_ROUTE') colorClass = 'bg-blue-600 animate-pulse';
      else if (amb.status === 'MAINTENANCE') colorClass = 'bg-amber-500';

      const ambHtml = `
        <div class="cursor-pointer transition-transform hover:scale-110">
          <div class="w-7 h-7 rounded-full ${colorClass} border-2 border-white shadow-lg flex items-center justify-center text-white text-[11px] font-bold">
            🚑
          </div>
        </div>
      `;

      const ambIcon = L.divIcon({
        html: ambHtml,
        className: 'custom-amb-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([loc.lat - 0.003, loc.lng - 0.003], { icon: ambIcon }).addTo(group);
      marker.bindPopup(`
        <div class="text-xs p-1 font-sans">
          <span class="inline-block bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded text-[10px] mb-1">${amb.type} AMBULANCE</span>
          <div class="font-bold text-slate-900">${amb.vehicleNumber}</div>
          <div class="text-slate-600 mt-0.5">Status: <b class="${amb.status === 'AVAILABLE' ? 'text-emerald-600' : 'text-blue-600'}">${amb.status}</b></div>
          <div class="text-slate-500 text-[10px]">Driver: ${amb.driverName} (${amb.contactNumber})</div>
        </div>
      `);
    });

    // 6. Draw Active Pending Emergencies
    emergencies
      .filter((e) => e.status === 'PENDING' || e.status === 'ASSIGNED')
      .forEach((emg) => {
        const loc = locMap.get(emg.locationId);
        if (!loc) return;

        const isCrit = emg.severity === 'CRITICAL';
        const emgHtml = `
          <div class="relative cursor-pointer transition-transform hover:scale-125">
            <span class="absolute -inset-1 rounded-full ${isCrit ? 'bg-red-500' : 'bg-amber-500'} opacity-75 animate-ping"></span>
            <div class="relative w-7 h-7 rounded-full ${isCrit ? 'bg-red-600' : 'bg-amber-600'} border-2 border-white shadow-xl flex items-center justify-center text-white text-[12px] font-extrabold">
              !
            </div>
          </div>
        `;

        const emgIcon = L.divIcon({
          html: emgHtml,
          className: 'custom-emg-icon',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([loc.lat + 0.001, loc.lng - 0.002], { icon: emgIcon }).addTo(group);
        marker.bindPopup(`
          <div class="text-xs p-1 font-sans min-w-[170px]">
            <span class="inline-block ${isCrit ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'} font-bold px-1.5 py-0.5 rounded text-[10px] mb-1">
              ${emg.severity} EMERGENCY
            </span>
            <div class="font-bold text-slate-900">${emg.title}</div>
            <div class="text-slate-600 text-[11px] mt-0.5">Patient: ${emg.patientName}</div>
            <div class="text-slate-500 text-[10px]">Specialty: ${emg.requiredSpecialty}</div>
            <div class="text-slate-400 text-[10px] mt-1">Status: ${emg.status}</div>
          </div>
        `);
      });
  }, [locations, roads, ambulances, hospitals, emergencies, activeRoute, selectedLocationId, onSelectLocation]);

  // Compute SVG Graph Fallback coordinates
  // Normalized to [50, 750] x [50, 450]
  const minLat = Math.min(...locations.map((l) => l.lat), 18.50);
  const maxLat = Math.max(...locations.map((l) => l.lat), 18.62);
  const minLng = Math.min(...locations.map((l) => l.lng), 73.72);
  const maxLng = Math.max(...locations.map((l) => l.lng), 73.88);

  const getSvgX = (lng: number) => 50 + ((lng - minLng) / (maxLng - minLng || 1)) * 700;
  const getSvgY = (lat: number) => 450 - ((lat - minLat) / (maxLat - minLat || 1)) * 380;

  const locCoordMap = new Map<string, { x: number; y: number; node: LocationNode }>();
  locations.forEach((l) => {
    locCoordMap.set(l.id, { x: getSvgX(l.lng), y: getSvgY(l.lat), node: l });
  });

  return (
    <div className={`relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-lg ${className}`}>
      {/* Top Map HUD Overlay */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs shadow-md">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-semibold text-slate-200">Pune Metro Emergency Grid</span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-400">{locations.length} Nodes</span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-400">{roads.length} Links</span>
        {roads.filter((r) => r.isBlocked).length > 0 && (
          <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {roads.filter((r) => r.isBlocked).length} Blocked
          </span>
        )}
      </div>

      {/* Switch between Map tiles and SVG Graph fallback */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        <button
          onClick={() => setUseSvgFallback(!useSvgFallback)}
          className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 shadow transition"
          title="Toggle between OpenStreetMap and Topological Graph view"
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          {useSvgFallback ? 'Switch to Street Map' : 'Topological Graph View'}
        </button>
      </div>

      {/* Active Route HUD */}
      {activeRoute && activeRoute.hasPath && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-blue-950/90 backdrop-blur-md border border-blue-500/50 text-white px-3.5 py-2 rounded-lg text-xs shadow-xl flex items-center gap-3">
          <div className="p-1.5 bg-blue-600 rounded-md">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold flex items-center gap-1 text-blue-200">
              C++ Dijkstra Route Calculated
            </div>
            <div className="text-slate-300 font-medium text-[11px]">
              Est. Travel Time: <b className="text-white text-xs">{activeRoute.totalTravelTimeMinutes} min</b> ({activeRoute.totalDistanceKm} km)
            </div>
          </div>
        </div>
      )}

      {/* Map Content */}
      {!useSvgFallback ? (
        <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-0" />
      ) : (
        /* Topological Graph SVG Canvas Fallback */
        <div style={{ height }} className="w-full bg-slate-950 p-4 flex flex-col justify-center items-center overflow-auto">
          <svg viewBox="0 0 800 500" className="w-full h-full max-h-[600px] select-none">
            {/* Draw Graph Edges */}
            {roads.map((road) => {
              const u = locCoordMap.get(road.source);
              const v = locCoordMap.get(road.target);
              if (!u || !v) return null;

              const isBlocked = road.isBlocked;
              const isRoute =
                activeRoute?.hasPath &&
                activeRoute.steps?.some(
                  (s) =>
                    (s.fromId === road.source && s.toId === road.target) ||
                    (s.fromId === road.target && s.toId === road.source)
                );

              const strokeColor = isBlocked ? '#EF4444' : isRoute ? '#3B82F6' : '#475569';
              const strokeWidth = isRoute ? 4 : isBlocked ? 2.5 : 2;

              return (
                <g key={road.id}>
                  <line
                    x1={u.x}
                    y1={u.y}
                    x2={v.x}
                    y2={v.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isBlocked ? '6,6' : undefined}
                    opacity={isBlocked ? 0.9 : isRoute ? 1 : 0.6}
                  />
                  {/* Road Weight Label */}
                  <rect
                    x={(u.x + v.x) / 2 - 18}
                    y={(u.y + v.y) / 2 - 9}
                    width={36}
                    height={18}
                    rx={4}
                    fill={isBlocked ? '#7F1D1D' : isRoute ? '#1E3A8A' : '#1E293B'}
                    stroke={strokeColor}
                    strokeWidth={1}
                  />
                  <text
                    x={(u.x + v.x) / 2}
                    y={(u.y + v.y) / 2 + 4}
                    fill={isBlocked ? '#FCA5A5' : isRoute ? '#93C5FD' : '#94A3B8'}
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {isBlocked ? 'BLOCK' : `${road.travelTimeMinutes}m`}
                  </text>
                </g>
              );
            })}

            {/* Draw Graph Nodes */}
            {Array.from(locCoordMap.values()).map(({ x, y, node }) => {
              const isSelected = selectedLocationId === node.id;
              const isRouteNode = activeRoute?.path?.includes(node.id);
              const hasHospital = hospitals.some((h) => h.locationId === node.id);
              const hasAmbulance = ambulances.some((a) => a.currentLocationId === node.id && a.status === 'AVAILABLE');
              const hasEmergency = emergencies.some(
                (e) => e.locationId === node.id && (e.status === 'PENDING' || e.status === 'ASSIGNED')
              );

              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  onClick={() => onSelectLocation && onSelectLocation(node.id)}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 16 : isRouteNode ? 14 : 12}
                    fill={isSelected ? '#2563EB' : isRouteNode ? '#1D4ED8' : '#334155'}
                    stroke={hasEmergency ? '#EF4444' : hasHospital ? '#10B981' : '#FFFFFF'}
                    strokeWidth={hasEmergency || hasHospital ? 3 : 2}
                  />
                  <text
                    x={x}
                    y={y + 3}
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {node.name.substring(0, 2).toUpperCase()}
                  </text>
                  <text
                    x={x}
                    y={y + 24}
                    fill="#CBD5E1"
                    fontSize="10"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {node.name.split(' ')[0]}
                  </text>
                  {/* Indicators */}
                  {hasHospital && (
                    <circle cx={x + 10} cy={y - 10} r={5} fill="#10B981" stroke="#FFFFFF" strokeWidth={1} />
                  )}
                  {hasEmergency && (
                    <circle cx={x - 10} cy={y - 10} r={5} fill="#EF4444" stroke="#FFFFFF" strokeWidth={1} />
                  )}
                  {hasAmbulance && (
                    <circle cx={x} cy={y - 14} r={4.5} fill="#3B82F6" stroke="#FFFFFF" strokeWidth={1} />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Legend Footer */}
      <div className="absolute bottom-3 right-3 z-[1000] hidden md:flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] text-slate-300 shadow">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-600 border border-white"></span> Location
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-emerald-600"></span> Hospital
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Ambulance
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span> Emergency
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-red-500 border-dashed"></span> Blocked
        </span>
      </div>
    </div>
  );
};
