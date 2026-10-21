import React from 'react';
import type { Hospital, LocationNode } from '../types';
import { Building2, Stethoscope, Bed, Phone, MapPin, Plus, Minus, CheckCircle } from 'lucide-react';

interface HospitalsPageProps {
  hospitals: Hospital[];
  locations: LocationNode[];
  onUpdateBeds: (id: string, availableBeds: number) => void;
}

export const HospitalsPage: React.FC<HospitalsPageProps> = ({
  hospitals,
  locations,
  onUpdateBeds,
}) => {
  const locMap = new Map<string, string>();
  locations.forEach((l) => locMap.set(l.id, l.name));

  const totalBeds = hospitals.reduce((sum, h) => sum + h.totalBeds, 0);
  const totalAvailable = hospitals.reduce((sum, h) => sum + h.availableBeds, 0);
  const totalIcu = hospitals.reduce((sum, h) => sum + h.icuAvailable, 0);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Hospital Capacity</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{totalBeds} Beds</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across {hospitals.length} partner centers</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Available General Beds</div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600">{totalAvailable} Beds</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {((totalAvailable / totalBeds) * 100).toFixed(1)}% immediate occupancy vacancy
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Available ICU Critical Beds</div>
          <div className="mt-2 text-2xl font-extrabold text-blue-600">{totalIcu} Units</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Ventilator & cardiac monitored</div>
        </div>
      </div>

      {/* Hospital Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {hospitals.map((hosp) => {
          const occupancyPct = Math.round(((hosp.totalBeds - hosp.availableBeds) / hosp.totalBeds) * 100);

          return (
            <div
              key={hosp.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400">#{hosp.id}</span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{hosp.name}</h3>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Partner
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-800">
                    {locMap.get(hosp.locationId) || hosp.locationId}
                  </span>
                </div>

                {/* Bed Capacity Progress Bar */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Bed className="w-4 h-4 text-slate-500" />
                      Bed Availability
                    </span>
                    <span className="text-slate-600">
                      <b className="text-emerald-700 text-sm font-extrabold">{hosp.availableBeds}</b> / {hosp.totalBeds} free
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        occupancyPct > 85 ? 'bg-red-500' : occupancyPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${occupancyPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Occupancy: {occupancyPct}%</span>
                    <span>ICU Available: <b className="text-blue-700 font-bold">{hosp.icuAvailable}</b></span>
                  </div>
                </div>

                {/* Specialties */}
                <div className="mt-4">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Medical Specialties & Facilities
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {hosp.specialties.map((sp, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium"
                      >
                        {sp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Adjust Beds Controls */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="text-slate-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-[11px]">{hosp.contactEmergency}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Simulate Beds:</span>
                  <button
                    disabled={hosp.availableBeds <= 0}
                    onClick={() => onUpdateBeds(hosp.id, hosp.availableBeds - 1)}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 transition"
                    title="Admit patient (decrease 1 bed)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-slate-800 text-xs w-6 text-center">
                    {hosp.availableBeds}
                  </span>
                  <button
                    disabled={hosp.availableBeds >= hosp.totalBeds}
                    onClick={() => onUpdateBeds(hosp.id, hosp.availableBeds + 1)}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 transition"
                    title="Discharge patient (increase 1 bed)"
                  >
                    <Plus className="w-3.5 h-3.5" />
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
