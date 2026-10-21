import React, { useState } from 'react';
import type { Emergency, LocationNode, EmergencyStatus } from '../types';
import {
  AlertCircle,
  PlusCircle,
  Filter,
  Flame,
  Clock,
  MapPin,
  Stethoscope,
  Zap,
  CheckCircle2,
  Phone,
  ShieldAlert,
} from 'lucide-react';

interface EmergenciesPageProps {
  emergencies: Emergency[];
  locations: LocationNode[];
  onOpenNewModal: () => void;
  onDispatchClick: (emergency: Emergency) => void;
}

export const EmergenciesPage: React.FC<EmergenciesPageProps> = ({
  emergencies,
  locations,
  onOpenNewModal,
  onDispatchClick,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const locMap = new Map<string, string>();
  locations.forEach((l) => locMap.set(l.id, l.name));

  const filtered = emergencies.filter((e) => {
    if (statusFilter === 'ALL') return true;
    return e.status === statusFilter;
  });

  // Calculate stats
  const pendingCount = emergencies.filter((e) => e.status === 'PENDING').length;
  const criticalCount = emergencies.filter((e) => e.severity === 'CRITICAL' && e.status === 'PENDING').length;
  const highCount = emergencies.filter((e) => e.severity === 'HIGH' && e.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Queue Explanation */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-red-600 rounded-lg">
              <ShieldAlert className="w-4 h-4 text-white" />
            </span>
            <h2 className="text-base font-bold text-white">Emergency Dispatch Queue</h2>
            <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30">
              C++ Custom Min-Heap Order
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Triage uses a lexicographical key <code className="font-mono text-blue-300">(SeverityRank, ReportedTimestamp)</code>:
            Critical (1) takes precedence over High (2), Medium (3), and Low (4). Equal severities are resolved FIFO by timestamp.
          </p>
        </div>

        <button
          onClick={onOpenNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register Emergency</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
          {(['ALL', 'PENDING', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg font-bold transition text-xs ${
                statusFilter === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>Showing <b>{filtered.length}</b> records</span>
          {pendingCount > 0 && (
            <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
              {pendingCount} Pending Dispatch
            </span>
          )}
        </div>
      </div>

      {/* Emergency Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl p-12 text-center text-slate-400 border border-slate-200 text-xs">
            No emergency requests match filter "{statusFilter}".
          </div>
        ) : (
          filtered.map((emg, idx) => {
            const isCrit = emg.severity === 'CRITICAL';
            const isHigh = emg.severity === 'HIGH';
            const isPending = emg.status === 'PENDING';

            return (
              <div
                key={emg.id}
                className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-md transition flex flex-col justify-between ${
                  isCrit && isPending
                    ? 'border-red-400 ring-2 ring-red-100'
                    : isHigh && isPending
                    ? 'border-orange-300'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isCrit
                              ? 'bg-red-600 text-white'
                              : isHigh
                              ? 'bg-orange-500 text-white'
                              : emg.severity === 'MEDIUM'
                              ? 'bg-amber-500 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {emg.severity}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">#{emg.id}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{emg.title}</h3>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        emg.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : emg.status === 'ASSIGNED'
                          ? 'bg-blue-100 text-blue-800'
                          : emg.status === 'IN_TRANSIT'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {emg.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700">Patient:</span>
                      <span className="truncate">{emg.patientName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate font-semibold text-slate-800">
                        {locMap.get(emg.locationId) || emg.locationId}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Stethoscope className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{emg.requiredSpecialty}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate text-slate-400">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{new Date(emg.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {emg.notes && (
                    <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                      "{emg.notes}"
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{emg.callerContact || '+91 98900 00000'}</span>
                  </div>

                  {isPending ? (
                    <button
                      onClick={() => onDispatchClick(emg)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs transition"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Dispatch Ambulance</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Dispatched via Dijkstra</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
