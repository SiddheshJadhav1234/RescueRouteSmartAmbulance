import React, { useState } from 'react';
import type { LocationNode, EmergencySeverity } from '../types';
import { X, AlertCircle, ShieldAlert, HeartPulse, Stethoscope, MapPin } from 'lucide-react';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: LocationNode[];
  onSubmit: (data: {
    title: string;
    patientName: string;
    callerContact: string;
    severity: EmergencySeverity;
    locationId: string;
    requiredSpecialty: string;
    notes: string;
  }) => Promise<void>;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  locations,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [patientName, setPatientName] = useState('');
  const [callerContact, setCallerContact] = useState('');
  const [severity, setSeverity] = useState<EmergencySeverity>('HIGH');
  const [locationId, setLocationId] = useState(locations[0]?.id || 'LOC_HINJEWADI');
  const [requiredSpecialty, setRequiredSpecialty] = useState('Cardiology');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Emergency title/condition is required.');
      return;
    }
    if (!patientName.trim()) {
      setError('Patient name and approximate age is required.');
      return;
    }
    if (!locationId) {
      setError('Please select an incident location.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        title: title.trim(),
        patientName: patientName.trim(),
        callerContact: callerContact.trim() || '+91 98900 00000',
        severity,
        locationId,
        requiredSpecialty,
        notes: notes.trim(),
      });
      // reset form
      setTitle('');
      setPatientName('');
      setCallerContact('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register emergency');
    } finally {
      setIsSubmitting(false);
    }
  };

  const presetScenarios = [
    { title: 'Acute Myocardial Infarction', severity: 'CRITICAL', specialty: 'Cardiology', notes: 'Severe chest pressure, cyanosis, cold sweat.' },
    { title: 'Severe Head Injury & Road Trauma', severity: 'CRITICAL', specialty: 'Trauma', notes: 'Unconscious motorcyclist, active hemorrhage.' },
    { title: 'Compound Femur Fracture', severity: 'HIGH', specialty: 'Orthopedics', notes: 'Extreme pain, visible bone displacement.' },
    { title: 'Acute Respiratory Distress', severity: 'HIGH', specialty: 'Emergency Care', notes: 'Severe bronchospasm, SpO2 84%.' },
    { title: 'Moderate Dehydration with High Fever', severity: 'MEDIUM', specialty: 'General', notes: 'Fever 102.5F, mild disorientation.' },
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Register Emergency Incident</h2>
              <p className="text-xs text-slate-300">Added to C++ MinHeap Priority Queue for algorithmic dispatch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick presets */}
        <div className="px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Quick Simulation Presets:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presetScenarios.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTitle(p.title);
                  setSeverity(p.severity as EmergencySeverity);
                  setRequiredSpecialty(p.specialty);
                  setNotes(p.notes);
                }}
                className="text-[11px] bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-700 text-slate-700 px-2 py-1 rounded-md transition shadow-2xs font-medium"
              >
                {p.title.split(' ')[0]} {p.title.split(' ')[1]} ({p.severity})
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Emergency Condition / Incident Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acute Myocardial Infarction / Multiple Vehicle Pileup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Patient Name & Age *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Anand Deshmukh (54M)"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Caller Contact Number
              </label>
              <input
                type="text"
                placeholder="+91 98200 12345"
                value={callerContact}
                onChange={(e) => setCallerContact(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Severity Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between">
              <span>Triage Severity (Min-Heap Priority) *</span>
              <span className="text-[11px] text-slate-500 font-normal">
                CRITICAL (Rank 1) takes highest precedence in queue
              </span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { level: 'CRITICAL', label: '1. Critical', color: 'bg-red-600 text-white', border: 'border-red-600', ring: 'ring-red-400' },
                  { level: 'HIGH', label: '2. High', color: 'bg-orange-500 text-white', border: 'border-orange-500', ring: 'ring-orange-400' },
                  { level: 'MEDIUM', label: '3. Medium', color: 'bg-amber-500 text-white', border: 'border-amber-500', ring: 'ring-amber-400' },
                  { level: 'LOW', label: '4. Low', color: 'bg-blue-600 text-white', border: 'border-blue-600', ring: 'ring-blue-400' },
                ] as const
              ).map((s) => {
                const isSelected = severity === s.level;
                return (
                  <button
                    key={s.level}
                    type="button"
                    onClick={() => setSeverity(s.level)}
                    className={`py-2 px-2 rounded-lg text-xs font-bold text-center border transition ${
                      isSelected
                        ? `${s.color} ${s.border} ring-2 ${s.ring} shadow-sm`
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Incident Location *</span>
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.zone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                <span>Required Specialty *</span>
              </label>
              <select
                value={requiredSpecialty}
                onChange={(e) => setRequiredSpecialty(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Cardiology">Cardiology (Cardiac Care)</option>
                <option value="Trauma">Trauma & Critical Care</option>
                <option value="Orthopedics">Orthopedics & Fractures</option>
                <option value="Neurology">Neurology & Stroke</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="General">General Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Field & Clinical Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Patient conscious but dyspneic. Requires ALS ambulance with cardiac monitor."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition flex items-center gap-2"
            >
              {isSubmitting ? 'Enqueueing...' : 'Enqueue Emergency'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
