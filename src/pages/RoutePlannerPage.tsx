import React, { useState } from 'react';
import type { LocationNode, RoadEdge, RouteResult } from '../types';
import { api } from '../services/api';
import { MapView } from '../components/MapView';
import {
  Navigation,
  Zap,
  Clock,
  MapPin,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface RoutePlannerPageProps {
  locations: LocationNode[];
  roads: RoadEdge[];
  onToggleRoad: (roadId: string) => Promise<void>;
}

export const RoutePlannerPage: React.FC<RoutePlannerPageProps> = ({
  locations,
  roads,
  onToggleRoad,
}) => {
  const [sourceId, setSourceId] = useState<string>(locations[0]?.id || 'LOC_HINJEWADI');
  const [destinationId, setDestinationId] = useState<string>(locations[6]?.id || 'LOC_SHIVAJINAGAR');
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locMap = new Map<string, string>();
  locations.forEach((l) => locMap.set(l.id, l.name));

  const handleCalculateRoute = async () => {
    if (sourceId === destinationId) {
      setError('Source and Destination locations must be distinct.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await api.calculateRoute(sourceId, destinationId);
      setRouteResult(res);
      if (!res.hasPath) {
        setError(res.errorMessage || 'No navigable path exists between selected locations.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to calculate shortest path');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAndRecalculate = async (roadId: string) => {
    await onToggleRoad(roadId);
    // Recalculate route immediately with new road states
    try {
      setIsLoading(true);
      const res = await api.calculateRoute(sourceId, destinationId);
      setRouteResult(res);
      if (!res.hasPath) {
        setError(res.errorMessage || 'No navigable path exists after road blockage.');
      } else {
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Route Setup Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Dijkstra Shortest Path Engine</h2>
              <p className="text-xs text-slate-500">
                Custom C++ Min-Heap Priority Queue implementation • O((V+E)logV)
              </p>
            </div>
          </div>

          <button
            onClick={handleCalculateRoute}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition shrink-0"
          >
            <Zap className="w-4 h-4" />
            <span>{isLoading ? 'Computing in C++...' : 'Calculate Shortest Path'}</span>
          </button>
        </div>

        {/* Source and Destination Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Start Origin Location</span>
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.zone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Destination Emergency / Hospital</span>
            </label>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.zone})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Map & Route Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Column (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <MapView
            locations={locations}
            roads={roads}
            activeRoute={routeResult}
            height="500px"
          />
        </div>

        {/* Route Details Panel */}
        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Navigation Warning</span>
              </div>
              <p>{error}</p>
            </div>
          )}

          {routeResult && routeResult.hasPath ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  C++ Algorithmic Result
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-blue-700">
                    {routeResult.totalTravelTimeMinutes} min
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {routeResult.totalDistanceKm} km total
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Guaranteed minimum estimated travel time</span>
                </div>
              </div>

              {/* Turn-by-turn road steps */}
              <div>
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2.5">
                  Ordered Path ({routeResult.path.length} Nodes, {routeResult.steps.length} Edges)
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {routeResult.steps.map((step, idx) => {
                    const road = roads.find((r) => r.id === step.roadId);
                    const isBlocked = road?.isBlocked;

                    return (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] flex items-center justify-center font-mono">
                              {idx + 1}
                            </span>
                            <span className="truncate">{step.roadName}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 ml-5">
                            {locMap.get(step.fromId)} → {locMap.get(step.toId)} ({step.travelTimeMinutes} min, {step.distanceKm} km)
                          </div>
                        </div>

                        {/* Block simulator button for this step */}
                        <button
                          onClick={() => handleToggleAndRecalculate(step.roadId)}
                          className={`text-[10px] px-2 py-1 rounded font-bold transition shrink-0 ${
                            isBlocked
                              ? 'bg-red-600 text-white'
                              : 'bg-white border border-slate-300 hover:border-red-400 text-slate-700 hover:text-red-700'
                          }`}
                          title="Block this road to see Dijkstra automatically recalculate an alternate detour!"
                        >
                          {isBlocked ? 'Unblock' : 'Block Road'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  Tip: Click <b>Block Road</b> on any step above to witness Dijkstra recalculate a detour around it!
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs space-y-2">
              <Navigation className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Select origin and destination, then click "Calculate Shortest Path" to run C++ Dijkstra.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
