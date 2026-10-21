import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { LocationNode, RoadEdge, Ambulance, Hospital, Emergency, Dispatch, RouteStep } from '../types.js';

// Deterministic Pune initial seed data
const INITIAL_LOCATIONS: LocationNode[] = [
  { id: 'LOC_HINJEWADI', name: 'Hinjewadi Phase 1', zone: 'West Tech Corridor', lat: 18.5913, lng: 73.7389, landmark: 'Near Rajiv Gandhi Infotech Park' },
  { id: 'LOC_WAKAD', name: 'Wakad Junction', zone: 'West Zone', lat: 18.5987, lng: 73.7667, landmark: 'Dange Chowk Flyover' },
  { id: 'LOC_BANER', name: 'Baner High Street', zone: 'West Suburb', lat: 18.5590, lng: 73.7868, landmark: 'Near Balewadi High Street Exit' },
  { id: 'LOC_BALEWADI', name: 'Balewadi Sports Complex', zone: 'West Suburb', lat: 18.5772, lng: 73.7712, landmark: 'Shree Shiv Chhatrapati Sports Complex' },
  { id: 'LOC_AUNDH', name: 'Aundh Medical Hub', zone: 'Central-West', lat: 18.5580, lng: 73.8070, landmark: 'Parihar Chowk' },
  { id: 'LOC_PIMPLE_SAUDAGAR', name: 'Pimple Saudagar', zone: 'North-West PCMC', lat: 18.5954, lng: 73.8010, landmark: 'Kunil Chowk / Roseland Residency' },
  { id: 'LOC_SHIVAJINAGAR', name: 'Shivajinagar Station', zone: 'Central Pune', lat: 18.5314, lng: 73.8446, landmark: 'Near COEP Tech Campus' },
  { id: 'LOC_DECCAN', name: 'Deccan Gymkhana', zone: 'South-Central', lat: 18.5167, lng: 73.8415, landmark: 'Goodluck Cafe Circle' },
  { id: 'LOC_KOTHRUD', name: 'Kothrud Paud Road', zone: 'South-West', lat: 18.5074, lng: 73.8077, landmark: 'Near MIT World Peace University' },
  { id: 'LOC_SWARGATE', name: 'Swargate Transit Hub', zone: 'South Pune', lat: 18.5018, lng: 73.8636, landmark: 'Swargate ST Stand' },
];

const INITIAL_ROADS: RoadEdge[] = [
  { id: 'ROAD_1', source: 'LOC_HINJEWADI', target: 'LOC_WAKAD', roadName: 'Hinjewadi-Wakad Bridge Road', distanceKm: 4.5, travelTimeMinutes: 8.0, isBlocked: false, isBidirectional: true },
  { id: 'ROAD_2', source: 'LOC_WAKAD', target: 'LOC_BALEWADI', roadName: 'Wakad-Balewadi Link Expressway', distanceKm: 3.2, travelTimeMinutes: 5.0, isBlocked: false, isBidirectional: true },
  { id: 'ROAD_3', source: 'LOC_BALEWADI', target: 'LOC_BANER', roadName: 'Balewadi High Street Link', distanceKm: 2.8, travelTimeMinutes: 6.0, isBlocked: false, isBidirectional: true },
  { id: 'ROAD_4', source: 'LOC_WAKAD', target: 'LOC_PIMPLE_SAUDAGAR', roadName: 'Wakad-Pimple Saudagar BRT Corridor', distanceKm: 4.0, travelTimeMinutes: 7.0, isBlocked: false, isBidirectional: true },
  { id: 'ROAD_5', source: 'LOC_PIMPLE_SAUDAGAR', target: 'LOC_AUNDH', roadName: 'Aundh-Ravet Spine Road', distanceKm: 5.2, travelTimeMinutes: 9.0, isBlocked: false, isBidirectional: true },
  { id: 'ROAD_6', source: 'LOC_BANER', target: 'LOC_AUNDH', roadName: 'Baner Road', distanceKm: 3.8, travelTimeMinutes: 7.0, isBlocked: false, isBidirectional: true },
  { id: 'ROAD_7', source: 'LOC_AUNDH', target: 'LOC_SHIVAJINAGAR', roadName: 'Ganeshkhind Road Arterial', distanceKm: 6.5, travelTimeMinutes: 12.0, isBlocked: false, isBidirectional: true },
  { id: 'ROAD_8', source: 'LOC_SHIVAJINAGAR', target: 'LOC_DECCAN', roadName: 'FC Road / JM Road Connecting Flyover', distanceKm: 2.6, travelTimeMinutes: 5.0, isBlocked: false, isBidirectional: true },
  { id: 'ROAD_9', source: 'LOC_DECCAN', target: 'LOC_KOTHRUD', roadName: 'Karve Road Corridor', distanceKm: 4.8, travelTimeMinutes: 9.0, isBlocked: false, isBidirectional: true },
  { id: 'ROAD_10', source: 'LOC_DECCAN', target: 'LOC_SWARGATE', roadName: 'Tilak Road Express', distanceKm: 3.5, travelTimeMinutes: 8.0, isBlocked: false, isBidirectional: true },
  { id: 'ROAD_11', source: 'LOC_SHIVAJINAGAR', target: 'LOC_SWARGATE', roadName: 'Bajirao Road Rapid Link', distanceKm: 4.2, travelTimeMinutes: 10.0, isBlocked: false, isBidirectional: true },
  { id: 'ROAD_12', source: 'LOC_BANER', target: 'LOC_SHIVAJINAGAR', roadName: 'Pashan-University Elevated Road', distanceKm: 8.2, travelTimeMinutes: 14.0, isBlocked: false, isBidirectional: true },
  { id: 'ROAD_13', source: 'LOC_KOTHRUD', target: 'LOC_BANER', roadName: 'Chandani Chowk - Baner Bypass (NH-48)', distanceKm: 7.5, travelTimeMinutes: 11.0, isBlocked: false, isBidirectional: true },
];

const INITIAL_AMBULANCES: Ambulance[] = [
  { id: 'AMB_01', vehicleNumber: 'MH-12-RN-1011', type: 'ALS', status: 'AVAILABLE', currentLocationId: 'LOC_WAKAD', driverName: 'Rajesh Patil', contactNumber: '+91 98230 11011', equipmentLevel: 'Defibrillator, Ventilator, Syringe Pump, Cardiac Monitor', lastStatusUpdate: new Date().toISOString() },
  { id: 'AMB_02', vehicleNumber: 'MH-12-RN-2022', type: 'ALS', status: 'AVAILABLE', currentLocationId: 'LOC_SHIVAJINAGAR', driverName: 'Sunil More', contactNumber: '+91 98230 22022', equipmentLevel: 'Defibrillator, Ventilator, Oxygen Suction, ICU Kit', lastStatusUpdate: new Date().toISOString() },
  { id: 'AMB_03', vehicleNumber: 'MH-12-RN-3033', type: 'BLS', status: 'AVAILABLE', currentLocationId: 'LOC_BANER', driverName: 'Ganesh Shinde', contactNumber: '+91 98230 33033', equipmentLevel: 'Basic Stretcher, Pulse Oximeter, Oxygen Cylinder', lastStatusUpdate: new Date().toISOString() },
  { id: 'AMB_04', vehicleNumber: 'MH-12-RN-4044', type: 'BLS', status: 'AVAILABLE', currentLocationId: 'LOC_AUNDH', driverName: 'Vikas Deshmukh', contactNumber: '+91 98230 44044', equipmentLevel: 'First Aid Station, Splints, Automated BP, Oxygen Tank', lastStatusUpdate: new Date().toISOString() },
  { id: 'AMB_05', vehicleNumber: 'MH-12-RN-5055', type: 'ALS', status: 'DISPATCHED', currentLocationId: 'LOC_KOTHRUD', driverName: 'Nilesh Kadam', contactNumber: '+91 98230 55055', equipmentLevel: 'Full Cardiac Life Support, Transport Incubator', lastStatusUpdate: new Date().toISOString() },
  { id: 'AMB_06', vehicleNumber: 'MH-12-RN-6066', type: 'PATIENT_TRANSPORT', status: 'MAINTENANCE', currentLocationId: 'LOC_SWARGATE', driverName: 'Sachin Pawar', contactNumber: '+91 98230 66066', equipmentLevel: 'Wheelchair Lift, Patient Cot', lastStatusUpdate: new Date().toISOString() },
];

const INITIAL_HOSPITALS: Hospital[] = [
  { id: 'HOSP_01', name: 'Jupiter Hospital Pune', locationId: 'LOC_BANER', totalBeds: 350, availableBeds: 48, icuAvailable: 12, specialties: ['Cardiology', 'Trauma', 'Neurology', 'Multispecialty'], contactEmergency: '+91 20 2799 9999' },
  { id: 'HOSP_02', name: 'Sancheti Orthopedic & Trauma Centre', locationId: 'LOC_SHIVAJINAGAR', totalBeds: 200, availableBeds: 22, icuAvailable: 6, specialties: ['Trauma', 'Orthopedics', 'Spine Care'], contactEmergency: '+91 20 2899 9100' },
  { id: 'HOSP_03', name: 'Sahyadri Super Speciality Hospital', locationId: 'LOC_DECCAN', totalBeds: 280, availableBeds: 15, icuAvailable: 4, specialties: ['Cardiology', 'Neurology', 'Organ Transplant', 'Multispecialty'], contactEmergency: '+91 20 6721 3000' },
  { id: 'HOSP_04', name: 'Deenanath Mangeshkar Hospital', locationId: 'LOC_KOTHRUD', totalBeds: 500, availableBeds: 65, icuAvailable: 18, specialties: ['Cardiology', 'Pediatrics', 'Oncology', 'Emergency Care', 'Multispecialty'], contactEmergency: '+91 20 4015 1000' },
  { id: 'HOSP_05', name: 'Medipoint Hospital', locationId: 'LOC_AUNDH', totalBeds: 120, availableBeds: 18, icuAvailable: 5, specialties: ['General', 'Emergency Care', 'Maternity'], contactEmergency: '+91 20 6790 0000' },
];

const now = Date.now();
const INITIAL_EMERGENCIES: Emergency[] = [
  {
    id: 'EMG_01',
    title: 'Suspected Acute Myocardial Infarction',
    patientName: 'Ramesh Kulkarni (62M)',
    callerContact: '+91 98901 12345',
    severity: 'CRITICAL',
    locationId: 'LOC_HINJEWADI',
    requiredSpecialty: 'Cardiology',
    status: 'PENDING',
    notes: 'Severe chest pain radiating to left arm, sweating, shortness of breath.',
    reportedAt: new Date(now - 12 * 60 * 1000).toISOString(),
    reportedAtTimestamp: now - 12 * 60 * 1000,
  },
  {
    id: 'EMG_02',
    title: 'Motorcycle Highway Collision',
    patientName: 'Priya Joshi (28F)',
    callerContact: '+91 98902 23456',
    severity: 'HIGH',
    locationId: 'LOC_PIMPLE_SAUDAGAR',
    requiredSpecialty: 'Trauma',
    status: 'PENDING',
    notes: 'Compound fracture in lower right limb, moderate blood loss, conscious.',
    reportedAt: new Date(now - 8 * 60 * 1000).toISOString(),
    reportedAtTimestamp: now - 8 * 60 * 1000,
  },
  {
    id: 'EMG_03',
    title: 'Elderly Fall with Hip Pain',
    patientName: 'Kamalakar Joshi (75M)',
    callerContact: '+91 98903 34567',
    severity: 'MEDIUM',
    locationId: 'LOC_BANER',
    requiredSpecialty: 'Orthopedics',
    status: 'PENDING',
    notes: 'Unable to stand after bathroom slip, severe hip tenderness, stable vitals.',
    reportedAt: new Date(now - 19 * 60 * 1000).toISOString(),
    reportedAtTimestamp: now - 19 * 60 * 1000,
  },
  {
    id: 'EMG_04',
    title: 'High Grade Viral Fever with Dehydration',
    patientName: 'Aarav Mehta (8M)',
    callerContact: '+91 98904 45678',
    severity: 'LOW',
    locationId: 'LOC_BALEWADI',
    requiredSpecialty: 'General',
    status: 'PENDING',
    notes: 'Temperature 103F for 48 hrs, mild lethargy, drinking fluids with assistance.',
    reportedAt: new Date(now - 35 * 60 * 1000).toISOString(),
    reportedAtTimestamp: now - 35 * 60 * 1000,
  },
];

export class DatabaseService {
  private supabase: SupabaseClient | null = null;
  private isSupabaseConnected = false;

  // In-memory persistent transactional store
  private locations: LocationNode[] = JSON.parse(JSON.stringify(INITIAL_LOCATIONS));
  private roads: RoadEdge[] = JSON.parse(JSON.stringify(INITIAL_ROADS));
  private ambulances: Ambulance[] = JSON.parse(JSON.stringify(INITIAL_AMBULANCES));
  private hospitals: Hospital[] = JSON.parse(JSON.stringify(INITIAL_HOSPITALS));
  private emergencies: Emergency[] = JSON.parse(JSON.stringify(INITIAL_EMERGENCIES));
  private dispatches: Dispatch[] = [];

  constructor() {
    this.initSupabase();
  }

  private initSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project') && !supabaseKey.includes('your-supabase')) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });
        this.isSupabaseConnected = true;
        console.log('[DatabaseService] Supabase PostgreSQL client initialized successfully.');
      } catch (err: any) {
        console.warn('[DatabaseService] Failed to initialize Supabase client:', err.message);
        this.isSupabaseConnected = false;
      }
    } else {
      console.log('[DatabaseService] Supabase credentials not set or using placeholders. Operating with self-contained in-memory PostgreSQL simulation mode.');
    }
  }

  isUsingSupabase(): boolean {
    return this.isSupabaseConnected;
  }

  // --- Locations ---
  async getLocations(): Promise<LocationNode[]> {
    return [...this.locations];
  }

  async getLocationById(id: string): Promise<LocationNode | undefined> {
    return this.locations.find((l) => l.id === id);
  }

  // --- Roads ---
  async getRoads(): Promise<RoadEdge[]> {
    return [...this.roads];
  }

  async setRoadBlocked(roadId: string, isBlocked: boolean, reason?: string): Promise<RoadEdge> {
    const road = this.roads.find((r) => r.id === roadId);
    if (!road) throw new Error(`Road with ID '${roadId}' not found.`);
    road.isBlocked = isBlocked;
    if (reason !== undefined) road.blockReason = reason;
    return { ...road };
  }

  async toggleRoadBlocked(roadId: string): Promise<RoadEdge> {
    const road = this.roads.find((r) => r.id === roadId);
    if (!road) throw new Error(`Road with ID '${roadId}' not found.`);
    road.isBlocked = !road.isBlocked;
    if (road.isBlocked && !road.blockReason) {
      road.blockReason = 'Operator temporary closure / maintenance simulation';
    } else if (!road.isBlocked) {
      road.blockReason = undefined;
    }
    return { ...road };
  }

  // --- Ambulances ---
  async getAmbulances(): Promise<Ambulance[]> {
    return [...this.ambulances];
  }

  async getAmbulanceById(id: string): Promise<Ambulance | undefined> {
    return this.ambulances.find((a) => a.id === id);
  }

  async updateAmbulanceStatus(id: string, status: Ambulance['status'], currentLocationId?: string): Promise<Ambulance> {
    const amb = this.ambulances.find((a) => a.id === id);
    if (!amb) throw new Error(`Ambulance '${id}' not found.`);
    amb.status = status;
    if (currentLocationId) amb.currentLocationId = currentLocationId;
    amb.lastStatusUpdate = new Date().toISOString();
    return { ...amb };
  }

  // --- Hospitals ---
  async getHospitals(): Promise<Hospital[]> {
    return [...this.hospitals];
  }

  async getHospitalById(id: string): Promise<Hospital | undefined> {
    return this.hospitals.find((h) => h.id === id);
  }

  async updateHospitalBeds(id: string, availableBeds: number): Promise<Hospital> {
    const hosp = this.hospitals.find((h) => h.id === id);
    if (!hosp) throw new Error(`Hospital '${id}' not found.`);
    hosp.availableBeds = Math.max(0, Math.min(hosp.totalBeds, availableBeds));
    return { ...hosp };
  }

  // --- Emergencies ---
  async getEmergencies(statusFilter?: Emergency['status']): Promise<Emergency[]> {
    if (statusFilter) {
      return this.emergencies.filter((e) => e.status === statusFilter);
    }
    return [...this.emergencies];
  }

  async getEmergencyById(id: string): Promise<Emergency | undefined> {
    return this.emergencies.find((e) => e.id === id);
  }

  async createEmergency(data: Omit<Emergency, 'id' | 'reportedAt' | 'reportedAtTimestamp'>): Promise<Emergency> {
    const timestamp = Date.now();
    const id = `EMG_${String(this.emergencies.length + 1).padStart(2, '0')}_${Math.floor(Math.random() * 900 + 100)}`;
    const newEmergency: Emergency = {
      ...data,
      id,
      reportedAt: new Date(timestamp).toISOString(),
      reportedAtTimestamp: timestamp,
    };
    this.emergencies.unshift(newEmergency);
    return newEmergency;
  }

  async updateEmergency(id: string, updates: Partial<Emergency>): Promise<Emergency> {
    const emg = this.emergencies.find((e) => e.id === id);
    if (!emg) throw new Error(`Emergency '${id}' not found.`);
    Object.assign(emg, updates);
    return { ...emg };
  }

  // --- Dispatches ---
  async getDispatches(): Promise<Dispatch[]> {
    return this.dispatches.map((d) => this.hydrateDispatch(d));
  }

  async getDispatchById(id: string): Promise<Dispatch | undefined> {
    const d = this.dispatches.find((item) => item.id === id);
    if (!d) return undefined;
    return this.hydrateDispatch(d);
  }

  private hydrateDispatch(d: Dispatch): Dispatch {
    return {
      ...d,
      emergency: this.emergencies.find((e) => e.id === d.emergencyId),
      ambulance: this.ambulances.find((a) => a.id === d.ambulanceId),
      hospital: this.hospitals.find((h) => h.id === d.hospitalId),
    };
  }

  /**
   * Concurrency-safe atomic conditional update to assign an ambulance.
   * Prevents race conditions / double bookings if multiple dispatches trigger concurrently.
   */
  async createDispatchAtomic(data: {
    emergencyId: string;
    ambulanceId: string;
    hospitalId: string;
    totalTravelTimeMinutes: number;
    totalDistanceKm: number;
    dijkstraPath: string[];
    steps: RouteStep[];
  }): Promise<Dispatch> {
    // 1. Concurrency Check: Ambulance MUST be AVAILABLE
    const amb = this.ambulances.find((a) => a.id === data.ambulanceId);
    if (!amb) {
      throw new Error(`Ambulance '${data.ambulanceId}' does not exist.`);
    }
    if (amb.status !== 'AVAILABLE') {
      throw new Error(`Double-booking prevented: Ambulance '${amb.vehicleNumber}' is currently ${amb.status} and cannot be assigned.`);
    }

    // 2. Emergency Check: Must be PENDING
    const emg = this.emergencies.find((e) => e.id === data.emergencyId);
    if (!emg) {
      throw new Error(`Emergency '${data.emergencyId}' does not exist.`);
    }
    if (emg.status === 'COMPLETED' || emg.status === 'CANCELLED') {
      throw new Error(`Emergency '${emg.id}' is already closed.`);
    }

    // 3. Atomically transition states
    amb.status = 'DISPATCHED';
    amb.lastStatusUpdate = new Date().toISOString();

    emg.status = 'ASSIGNED';

    // Hospital bed decrement if available
    const hosp = this.hospitals.find((h) => h.id === data.hospitalId);
    if (hosp && hosp.availableBeds > 0) {
      hosp.availableBeds -= 1;
    }

    const dispatchId = `DSP_${String(this.dispatches.length + 1).padStart(3, '0')}_${Math.floor(Math.random() * 900 + 100)}`;
    const newDispatch: Dispatch = {
      id: dispatchId,
      emergencyId: data.emergencyId,
      ambulanceId: data.ambulanceId,
      hospitalId: data.hospitalId,
      status: 'DISPATCHED',
      totalTravelTimeMinutes: data.totalTravelTimeMinutes,
      totalDistanceKm: data.totalDistanceKm,
      dijkstraPath: data.dijkstraPath,
      algorithmUsed: 'C++ Dijkstra (MinHeap)',
      dispatchedAt: new Date().toISOString(),
      steps: data.steps,
    };

    this.dispatches.unshift(newDispatch);
    return this.hydrateDispatch(newDispatch);
  }

  async updateDispatchStatus(dispatchId: string, status: Dispatch['status']): Promise<Dispatch> {
    const disp = this.dispatches.find((d) => d.id === dispatchId);
    if (!disp) throw new Error(`Dispatch '${dispatchId}' not found.`);

    disp.status = status;

    const amb = this.ambulances.find((a) => a.id === disp.ambulanceId);
    const emg = this.emergencies.find((e) => e.id === disp.emergencyId);

    if (status === 'AMBULANCE_ARRIVED') {
      if (emg) emg.status = 'IN_TRANSIT';
      if (amb) amb.status = 'EN_ROUTE';
    } else if (status === 'PATIENT_PICKED_UP') {
      if (emg) emg.status = 'IN_TRANSIT';
      if (amb) amb.status = 'EN_ROUTE';
    } else if (status === 'COMPLETED') {
      disp.completedAt = new Date().toISOString();
      if (emg) emg.status = 'COMPLETED';
      // Release ambulance back to AVAILABLE at hospital location
      if (amb) {
        amb.status = 'AVAILABLE';
        const hosp = this.hospitals.find((h) => h.id === disp.hospitalId);
        if (hosp) {
          amb.currentLocationId = hosp.locationId;
        }
        amb.lastStatusUpdate = new Date().toISOString();
      }
    } else if (status === 'CANCELLED') {
      disp.completedAt = new Date().toISOString();
      if (emg) emg.status = 'CANCELLED';
      if (amb) {
        amb.status = 'AVAILABLE';
        amb.lastStatusUpdate = new Date().toISOString();
      }
    }

    return this.hydrateDispatch(disp);
  }

  // Reset database state to clean initial Pune simulation data
  async resetDatabase(): Promise<void> {
    this.locations = JSON.parse(JSON.stringify(INITIAL_LOCATIONS));
    this.roads = JSON.parse(JSON.stringify(INITIAL_ROADS));
    this.ambulances = JSON.parse(JSON.stringify(INITIAL_AMBULANCES));
    this.hospitals = JSON.parse(JSON.stringify(INITIAL_HOSPITALS));
    this.emergencies = JSON.parse(JSON.stringify(INITIAL_EMERGENCIES));
    this.dispatches = [];
  }
}

export const dbService = new DatabaseService();
