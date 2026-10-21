export type NavigationTab = 
  | 'overview' 
  | 'emergencies' 
  | 'fleet' 
  | 'hospitals' 
  | 'route-planner' 
  | 'road-network' 
  | 'analytics' 
  | 'docs';

export type EmergencySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type EmergencyStatus = 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
export type AmbulanceType = 'ALS' | 'BLS' | 'PATIENT_TRANSPORT';
export type AmbulanceStatus = 'AVAILABLE' | 'DISPATCHED' | 'MAINTENANCE' | 'EN_ROUTE';
export type DispatchStatus = 'DISPATCHED' | 'AMBULANCE_ARRIVED' | 'PATIENT_PICKED_UP' | 'AT_HOSPITAL' | 'COMPLETED' | 'CANCELLED';

export interface LocationNode {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  landmark?: string;
}

export interface RoadEdge {
  id: string;
  source: string;
  target: string;
  roadName: string;
  distanceKm: number;
  travelTimeMinutes: number;
  isBlocked: boolean;
  blockReason?: string;
  isBidirectional: boolean;
}

export interface Ambulance {
  id: string;
  vehicleNumber: string;
  type: AmbulanceType;
  status: AmbulanceStatus;
  currentLocationId: string;
  driverName: string;
  contactNumber: string;
  equipmentLevel: string;
  lastStatusUpdate: string;
}

export interface Hospital {
  id: string;
  name: string;
  locationId: string;
  totalBeds: number;
  availableBeds: number;
  icuAvailable: number;
  specialties: string[];
  contactEmergency: string;
}

export interface Emergency {
  id: string;
  title: string;
  patientName: string;
  callerContact?: string;
  severity: EmergencySeverity;
  locationId: string;
  requiredSpecialty: string;
  status: EmergencyStatus;
  notes?: string;
  reportedAt: string;
  reportedAtTimestamp: number;
}

export interface RouteStep {
  fromId: string;
  toId: string;
  roadId: string;
  roadName: string;
  travelTimeMinutes: number;
  distanceKm: number;
}

export interface RouteResult {
  hasPath: boolean;
  sourceId: string;
  destinationId: string;
  totalTravelTimeMinutes: number;
  totalDistanceKm: number;
  path: string[];
  steps: RouteStep[];
  errorMessage?: string;
}

export interface Dispatch {
  id: string;
  emergencyId: string;
  ambulanceId: string;
  hospitalId: string;
  status: DispatchStatus;
  totalTravelTimeMinutes: number;
  totalDistanceKm: number;
  dijkstraPath: string[];
  algorithmUsed: string;
  dispatchedAt: string;
  completedAt?: string;
  steps: RouteStep[];
  emergency?: Emergency;
  ambulance?: Ambulance;
  hospital?: Hospital;
}

export interface TraversalResult {
  algorithm: 'BFS' | 'DFS';
  startNodeId: string;
  visitOrder: string[];
  visitSteps: Array<{
    nodeId: string;
    depth: number;
    parent?: string | null;
    roadId?: string;
    roadName?: string;
  }>;
}

export interface DashboardStats {
  totalEmergencies: number;
  pendingEmergencies: number;
  criticalEmergencies: number;
  availableAmbulances: number;
  totalAmbulances: number;
  activeDispatches: number;
  completedMissions: number;
  blockedRoadsCount: number;
  totalRoads: number;
  totalHospitalBeds: number;
  availableHospitalBeds: number;
  avgResponseTimeMinutes: number;
  severityBreakdown: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
}
