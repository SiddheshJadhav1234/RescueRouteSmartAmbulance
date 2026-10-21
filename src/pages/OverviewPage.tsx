import React, { useState } from 'react';
import type {
  LocationNode,
  RoadEdge,
  Ambulance,
  Hospital,
  Emergency,
  Dispatch,
  DashboardStats,
  RouteResult,
} from '../types';
import { MapView } from '../components/MapView';
import {
  Activity,
  AlertCircle,
  Truck,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowRight,
  ShieldAlert,
  Flame,
  Radio,
} from 'lucide-react';

interface OverviewPageProps {
  locations: LocationNode[];
  roads: RoadEdge[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  emergencies: Emergency[];
  dispatches: Dispatch[];
  stats: DashboardStats | null;
  onDispatchClick: (emergency: Emergency) => void;
  onToggleRoad: (roadId: string) => void;
  onUpdateDispatchStatus: (dispatchId: string, status: Dispatch['status']) => void;
  onCompleteMission: (dispatchId: string) => void;
  onRefresh: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  locations,
  roads,
  ambulances,
  hospitals,
  emergencies,
  dispatches,
  stats,
  onDispatchClick,
  onToggleRoad,
  onUpdateDispatchStatus,
  onCompleteMission,
}) => {
  const [selectedRoute, setSelectedRoute] = useState<RouteResult | null>(null);

  const pendingEmergencies = emergencies.filter((e) => e.status === 'PENDING');
  const activeDispatches = dispatches.filter((d) => d.status !== 'COMPLETED' && d.status !== 'CANCELLED');

  const locMap = new Map<string, string>();
  locations.forEach((l) => locMap.set(l.id, l.name));

  // Determine active route to display on the map
  const activeMission = activeDispatches[0];
  const activeMissionRoute: RouteResult | null = activeMission
    ? {
        hasPath: true,
        sourceId: activeMission.dijkstraPath[0] || '',
        destinationId: activeMission.dijkstraPath[activeMission.dijkstraPath.length - 1] || '',
        totalTravelTimeMinutes: activeMission.totalTravelTimeMinutes,
        totalDistanceKm: activeMission.totalDistanceKm,
        path: activeMission.dijkstraPath,
        steps: activeMission.steps || [],
      }
    : selectedRoute;

  return (
    <div className="space-y-6">
      {/* 1. Executive Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Pending In Queue</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{stats?.pendingEmergencies ?? pendingEmergencies.length}</span>
            <span className="text-[10px] text-slate-500 font-medium">unassigned</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Critical Emergencies</span>
            <Flame className="w-4 h-4 text-red-600 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-red-600">{stats?.criticalEmergencies ?? 0}</span>
            <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">Rank 1</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Available Fleet</span>
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600">{stats?.availableAmbulances ?? 0}</span>
            <span className="text-[10px] text-slate-500">/ {stats?.totalAmbulances ?? ambulances.length}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Active Missions</span>
            <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-600">{stats?.activeDispatches ?? activeDispatches.length}</span>
            <span className="text-[10px] text-blue-600 font-medium">en-route</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Missions Done</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{stats?.completedMissions ?? 0}</span>
            <span className="text-[10px] text-slate-500">completed</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Avg Response</span>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-900">{stats?.avgResponseTimeMinutes ?? 8.5}</span>
            <span className="text-[10px] text-slate-500 font-medium">min</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Map & Live Corridor Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Citywide Emergency Response Map (Pune Metro)</span>
            </h2>
            <span className="text-xs text-slate-500">
              {roads.filter((r) => r.isBlocked).length > 0 ? (
                <span className="text-red-600 font-semibold">
                  ⚠️ {roads.filter((r) => r.isBlocked).length} road(s) currently blocked
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold">All road corridors open</span>
              )}
            </span>
          </div>

          <MapView
            locations={locations}
            roads={roads}
            ambulances={ambulances}
            hospitals={hospitals}
            emergencies={emergencies}
            activeRoute={activeMissionRoute}
            height="460px"
          />
        </div>

        {/* Right Column: Road Blocks & Quick Simulator */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Simulate Road Obstructions</span>
              </h3>
              <span className="text-[10px] text-slate-400">Click to Block/Reopen</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Toggle any road below to test C++ Dijkstra dynamic rerouting around traffic or closures:
            </p>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {roads.slice(0, 7).map((road) => (
                <div
                  key={road.id}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition ${
                    road.isBlocked
                      ? 'bg-red-50/80 border-red-300 text-red-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="truncate mr-2">
                    <div className="font-semibold truncate">{road.roadName}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                      <span>{road.distanceKm} km</span>
                      <span>•</span>
                      <span>{road.travelTimeMinutes} min</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleRoad(road.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold shrink-0 transition ${
                      road.isBlocked
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-2xs'
                        : 'bg-white border border-slate-300 hover:border-slate-400 text-slate-700'
                    }`}
                  >
                    {road.isBlocked ? 'Blocked' : 'Open'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Priority Queue & Active Dispatches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Queue (C++ Min-Heap) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>Emergency Priority Queue (C++ Binary Min-Heap)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically prioritized: Critical (1) &gt; High (2) &gt; Medium (3) &gt; Low (4), earlier reported first
              </p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
              {pendingEmergencies.length} Pending
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {pendingEmergencies.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No pending emergencies in queue. All incidents dispatched!
              </div>
            ) : (
              pendingEmergencies.map((emg, idx) => (
                <div key={emg.id} className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{emg.title}</span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                            emg.severity === 'CRITICAL'
                              ? 'bg-red-100 text-red-700'
                              : emg.severity === 'HIGH'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {emg.severity}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Patient: <b className="text-slate-700">{emg.patientName}</b> • Location:{' '}
                        <b className="text-slate-700">{locMap.get(emg.locationId)}</b>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDispatchClick(emg)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs transition shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Dispatch</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Dispatches / Mission Tracker */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Active Missions & Fleet Operations</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Real-time tracking of dispatches computed via C++ Dijkstra shortest paths
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
              {activeDispatches.length} Active
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {activeDispatches.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active dispatches currently en-route. Fleet is available.
              </div>
            ) : (
              activeDispatches.map((disp) => {
                const emg = emergencies.find((e) => e.id === disp.emergencyId);
                const amb = ambulances.find((a) => a.id === disp.ambulanceId);
                const hosp = hospitals.find((h) => h.id === disp.hospitalId);

                return (
                  <div key={disp.id} className="p-4 hover:bg-slate-50/80 transition text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{amb?.vehicleNumber || disp.ambulanceId}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="text-blue-700">{emg?.title || 'Emergency'}</span>
                      </div>
                      <span className="font-mono text-[11px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded">
                        ETA: ~{disp.totalTravelTimeMinutes} min
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Destination Hospital: <b className="text-slate-800">{hosp?.name || disp.hospitalId}</b></span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {disp.status}
                      </span>
                    </div>

                    {/* Progress Action Controls */}
                    <div className="pt-1 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-400 font-mono">
                        Path: {disp.dijkstraPath.map((id) => locMap.get(id)?.split(' ')[0]).join(' → ')}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {disp.status === 'DISPATCHED' && (
                          <button
                            onClick={() => onUpdateDispatchStatus(disp.id, 'AMBULANCE_ARRIVED')}
                            className="text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded transition"
                          >
                            Mark Arrived
                          </button>
                        )}
                        {disp.status === 'AMBULANCE_ARRIVED' && (
                          <button
                            onClick={() => onUpdateDispatchStatus(disp.id, 'PATIENT_PICKED_UP')}
                            className="text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition"
                          >
                            Mark Picked Up
                          </button>
                        )}
                        {(disp.status === 'PATIENT_PICKED_UP' || disp.status === 'AT_HOSPITAL' || disp.status === 'DISPATCHED') && (
                          <button
                            onClick={() => onCompleteMission(disp.id)}
                            className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded transition"
                          >
                            Complete Mission
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
