import React from 'react';
import type { Ambulance, LocationNode } from '../types';
import { Truck, ShieldCheck, Wrench, Radio, Phone, User, MapPin } from 'lucide-react';

interface FleetPageProps {
  ambulances: Ambulance[];
  locations: LocationNode[];
  onUpdateStatus: (id: string, status: Ambulance['status'], currentLocationId?: string) => void;
}

export const FleetPage: React.FC<FleetPageProps> = ({
  ambulances,
  locations,
  onUpdateStatus,
}) => {
  const locMap = new Map<string, string>();
  locations.forEach((l) => locMap.set(l.id, l.name));

  const availableCount = ambulances.filter((a) => a.status === 'AVAILABLE').length;
  const dispatchedCount = ambulances.filter((a) => a.status === 'DISPATCHED' || a.status === 'EN_ROUTE').length;
  const maintenanceCount = ambulances.filter((a) => a.status === 'MAINTENANCE').length;
  const alsCount = ambulances.filter((a) => a.type === 'ALS').length;

  return (
    <div className="space-y-6">
      {/* Fleet KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Fleet</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{ambulances.length} Units</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{alsCount} Advanced Life Support (ALS)</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Available for Dispatch</div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600">{availableCount} Units</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Ready for algorithmic assignment</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Active on Mission</div>
          <div className="mt-2 text-2xl font-extrabold text-blue-600">{dispatchedCount} Units</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Double-booking concurrency locked</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">In Maintenance</div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600">{maintenanceCount} Units</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Service & sanitation check</div>
        </div>
      </div>

      {/* Ambulance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ambulances.map((amb) => {
          const isAvailable = amb.status === 'AVAILABLE';
          const isDispatched = amb.status === 'DISPATCHED' || amb.status === 'EN_ROUTE';

          return (
            <div
              key={amb.id}
              className={`bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between transition hover:shadow-md ${
                isAvailable
                  ? 'border-emerald-200 ring-1 ring-emerald-50'
                  : isDispatched
                  ? 'border-blue-300 ring-1 ring-blue-50'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400">#{amb.id}</span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{amb.vehicleNumber}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      isAvailable
                        ? 'bg-emerald-100 text-emerald-800'
                        : isDispatched
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {amb.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Vehicle Type:</span>
                    <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {amb.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      Station Base:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {locMap.get(amb.currentLocationId) || amb.currentLocationId}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Driver:
                    </span>
                    <span className="font-medium text-slate-700">{amb.driverName}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      Contact:
                    </span>
                    <span className="font-mono text-slate-600">{amb.contactNumber}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Equipped Instruments:
                    </span>
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                      {amb.equipmentLevel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status control */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">Change Status:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={isAvailable}
                    onClick={() => onUpdateStatus(amb.id, 'AVAILABLE')}
                    className="px-2 py-1 text-[11px] font-bold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 transition"
                  >
                    Available
                  </button>
                  <button
                    disabled={amb.status === 'MAINTENANCE'}
                    onClick={() => onUpdateStatus(amb.id, 'MAINTENANCE')}
                    className="px-2 py-1 text-[11px] font-bold rounded bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40 transition"
                  >
                    Maintenance
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
