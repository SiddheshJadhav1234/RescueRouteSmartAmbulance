import React, { useState, useEffect } from 'react';
import type { Emergency, LocationNode, RoadEdge, Ambulance, Hospital, RouteResult } from '../types';
import { api } from '../services/api';
import {
  X,
  Truck,
  Building2,
  Navigation,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Zap,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  emergency: Emergency | null;
  locations: LocationNode[];
  onDispatchSuccess: () => void;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  isOpen,
  onClose,
  emergency,
  locations,
  onDispatchSuccess,
}) => {
  const [rankedAmbulances, setRankedAmbulances] = useState<Array<Ambulance & { etaMinutes: number; route: RouteResult }>>([]);
  const [rankedHospitals, setRankedHospitals] = useState<Array<Hospital & { travelTimeMinutes: number; compositeScore: number; route: RouteResult; hasRequiredSpecialty: boolean }>>([]);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string>('');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map of location names
  const locMap = new Map<string, string>();
  locations.forEach((l) => locMap.set(l.id, l.name));

  useEffect(() => {
    if (!isOpen || !emergency) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const loadRankings = async () => {
      try {
        const [ambs, hosps] = await Promise.all([
          api.rankAmbulances(emergency.locationId),
          api.rankHospitals(emergency.locationId, emergency.requiredSpecialty),
        ]);

        if (!isMounted) return;

        setRankedAmbulances(ambs);
        setRankedHospitals(hosps);

        // Auto-select top available ambulance with a valid path
        const topAmb = ambs.find((a) => a.status === 'AVAILABLE' && a.route && a.route.hasPath);
        if (topAmb) setSelectedAmbulanceId(topAmb.id);

        // Auto-select top hospital with a valid path
        const topHosp = hosps.find((h) => h.route && h.route.hasPath);
        if (topHosp) setSelectedHospitalId(topHosp.id);

        setIsLoading(false);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Failed to compute routes and rankings');
        setIsLoading(false);
      }
    };

    loadRankings();

    return () => {
      isMounted = false;
    };
  }, [isOpen, emergency]);

  if (!isOpen || !emergency) return null;

  const currentAmbulance = rankedAmbulances.find((a) => a.id === selectedAmbulanceId);
  const currentHospital = rankedHospitals.find((h) => h.id === selectedHospitalId);

  const ambLegTime = currentAmbulance?.route?.totalTravelTimeMinutes || 0;
  const hospLegTime = currentHospital?.route?.totalTravelTimeMinutes || 0;
  const totalMissionTime = ambLegTime + hospLegTime;

  const handleConfirmDispatch = async () => {
    if (!selectedAmbulanceId) {
      setError('Please select an available ambulance.');
      return;
    }
    if (!selectedHospitalId) {
      setError('Please select a target hospital.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await api.createDispatch({
        emergencyId: emergency.id,
        ambulanceId: selectedAmbulanceId,
        hospitalId: selectedHospitalId,
      });
      onDispatchSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Dispatch failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Algorithmic Ambulance Dispatch</h2>
                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30">
                  C++ Dijkstra (Min-Heap)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Evaluating fleet travel times & hospital specialty capabilities for incident #{emergency.id}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Emergency Info Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-slate-900">{emergency.title}</div>
            <div className="text-slate-600 text-[11px]">
              Patient: <span className="font-semibold text-slate-800">{emergency.patientName}</span> at{' '}
              <span className="font-semibold text-blue-700">{locMap.get(emergency.locationId)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded font-bold text-[11px] ${
                emergency.severity === 'CRITICAL'
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : emergency.severity === 'HIGH'
                  ? 'bg-orange-100 text-orange-700 border border-orange-200'
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}
            >
              {emergency.severity} Severity
            </span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold text-[11px] border border-blue-200">
              Specialty: {emergency.requiredSpecialty}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Computing shortest paths with C++ Dijkstra engine...</span>
            </div>
          ) : (
            <>
              {/* Step 1: Select Ambulance (Ranked by ETA) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>1. Eligible Ambulances (Ranked by C++ Dijkstra ETA)</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    O((V+E)logV) travel time evaluation
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {rankedAmbulances.map((amb) => {
                    const isSelected = selectedAmbulanceId === amb.id;
                    const isAvailable = amb.status === 'AVAILABLE';
                    const hasRoute = amb.route && amb.route.hasPath;

                    return (
                      <div
                        key={amb.id}
                        onClick={() => {
                          if (isAvailable && hasRoute) setSelectedAmbulanceId(amb.id);
                        }}
                        className={`p-3 rounded-xl border text-xs transition cursor-pointer ${
                          !isAvailable || !hasRoute
                            ? 'opacity-50 bg-slate-50 border-slate-200 cursor-not-allowed'
                            : isSelected
                            ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-300 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{amb.vehicleNumber}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded">
                              {amb.type}
                            </span>
                          </div>
                          <div className="text-right">
                            {hasRoute ? (
                              <span className="font-extrabold text-blue-700 text-xs">
                                {amb.etaMinutes} min ETA
                              </span>
                            ) : (
                              <span className="text-red-500 font-semibold text-[10px]">No Path</span>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
                          <span>Location: {locMap.get(amb.currentLocationId)}</span>
                          <span
                            className={`font-semibold ${
                              isAvailable ? 'text-emerald-600' : 'text-slate-500'
                            }`}
                          >
                            {amb.status}
                          </span>
                        </div>

                        {hasRoute && amb.route.path && (
                          <div className="text-[10px] text-slate-400 mt-1 font-mono truncate">
                            Route: {amb.route.path.map((id) => locMap.get(id)?.split(' ')[0]).join(' → ')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Select Hospital (Ranked by Score) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>2. Suitable Hospitals (Ranked by Capacity & Specialty)</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Target Specialty: <b className="text-slate-800">{emergency.requiredSpecialty}</b>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {rankedHospitals.map((hosp) => {
                    const isSelected = selectedHospitalId === hosp.id;
                    const hasRoute = hosp.route && hosp.route.hasPath;

                    return (
                      <div
                        key={hosp.id}
                        onClick={() => {
                          if (hasRoute) setSelectedHospitalId(hosp.id);
                        }}
                        className={`p-3 rounded-xl border text-xs transition cursor-pointer ${
                          !hasRoute
                            ? 'opacity-50 bg-slate-50 border-slate-200 cursor-not-allowed'
                            : isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-300 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-slate-900">{hosp.name}</div>
                          <span className="font-extrabold text-emerald-700 text-xs">
                            {hosp.travelTimeMinutes} min ETA
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
                          <span>Location: {locMap.get(hosp.locationId)}</span>
                          <span className="text-slate-700 font-medium">
                            Beds: <b className="text-emerald-700">{hosp.availableBeds}</b> / {hosp.totalBeds}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {hosp.specialties.map((sp, idx) => (
                            <span
                              key={idx}
                              className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                                sp === emergency.requiredSpecialty
                                  ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {sp}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mission Summary Box */}
              {currentAmbulance && currentHospital && (
                <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="font-bold text-blue-300 uppercase tracking-wider text-[11px]">
                      Complete Mission Path (Dijkstra 2-Leg Journey)
                    </span>
                    <span className="font-extrabold text-emerald-400 text-sm">
                      Total Mission Time: ~{totalMissionTime} min
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                    {/* Leg 1 */}
                    <div className="flex-1 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                      <div className="text-slate-400 text-[10px] font-semibold uppercase">
                        Leg 1: Dispatch to Patient
                      </div>
                      <div className="font-bold text-slate-100 mt-0.5">
                        {currentAmbulance.vehicleNumber} ({locMap.get(currentAmbulance.currentLocationId)})
                      </div>
                      <div className="text-blue-400 text-xs font-semibold mt-1">
                        ETA: {ambLegTime} min
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 hidden md:block" />

                    {/* Incident */}
                    <div className="flex-1 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                      <div className="text-slate-400 text-[10px] font-semibold uppercase">
                        Incident Location
                      </div>
                      <div className="font-bold text-slate-100 mt-0.5">
                        {locMap.get(emergency.locationId)}
                      </div>
                      <div className="text-red-400 text-xs font-semibold mt-1">
                        Patient Pick-up
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 hidden md:block" />

                    {/* Leg 2 */}
                    <div className="flex-1 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                      <div className="text-slate-400 text-[10px] font-semibold uppercase">
                        Leg 2: Transfer to Hospital
                      </div>
                      <div className="font-bold text-slate-100 mt-0.5">
                        {currentHospital.name}
                      </div>
                      <div className="text-emerald-400 text-xs font-semibold mt-1">
                        Transit: {hospLegTime} min
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Atomic status lock: Once confirmed, the ambulance is locked to prevent double-booking.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDispatch}
              disabled={isSubmitting || isLoading || !selectedAmbulanceId || !selectedHospitalId}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>{isSubmitting ? 'Dispatching...' : 'Confirm & Dispatch Ambulance'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
