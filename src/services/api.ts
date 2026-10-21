import type {
  LocationNode,
  RoadEdge,
  Ambulance,
  Hospital,
  Emergency,
  Dispatch,
  RouteResult,
  TraversalResult,
  DashboardStats,
} from '../types';

const API_BASE = '/api';

export const api = {
  // Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // Locations & Roads
  async getLocations(): Promise<LocationNode[]> {
    const res = await fetch(`${API_BASE}/locations`);
    if (!res.ok) throw new Error('Failed to fetch locations');
    return res.json();
  },

  async getRoads(): Promise<RoadEdge[]> {
    const res = await fetch(`${API_BASE}/roads`);
    if (!res.ok) throw new Error('Failed to fetch roads');
    return res.json();
  },

  async toggleRoad(roadId: string): Promise<{ success: boolean; message: string; road: RoadEdge }> {
    const res = await fetch(`${API_BASE}/roads/${roadId}/toggle`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to toggle road status');
    }
    return res.json();
  },

  // Ambulances
  async getAmbulances(): Promise<Ambulance[]> {
    const res = await fetch(`${API_BASE}/ambulances`);
    if (!res.ok) throw new Error('Failed to fetch ambulances');
    return res.json();
  },

  async updateAmbulanceStatus(id: string, status: Ambulance['status'], currentLocationId?: string): Promise<Ambulance> {
    const res = await fetch(`${API_BASE}/ambulances/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, currentLocationId }),
    });
    if (!res.ok) throw new Error('Failed to update ambulance status');
    return res.json();
  },

  async rankAmbulances(emergencyLocationId: string): Promise<Array<Ambulance & { etaMinutes: number; route: RouteResult }>> {
    const res = await fetch(`${API_BASE}/ambulances/rank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emergencyLocationId }),
    });
    if (!res.ok) throw new Error('Failed to rank ambulances');
    return res.json();
  },

  // Hospitals
  async getHospitals(): Promise<Hospital[]> {
    const res = await fetch(`${API_BASE}/hospitals`);
    if (!res.ok) throw new Error('Failed to fetch hospitals');
    return res.json();
  },

  async updateHospitalBeds(id: string, availableBeds: number): Promise<Hospital> {
    const res = await fetch(`${API_BASE}/hospitals/${id}/beds`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availableBeds }),
    });
    if (!res.ok) throw new Error('Failed to update hospital beds');
    return res.json();
  },

  async rankHospitals(emergencyLocationId: string, requiredSpecialty?: string): Promise<Array<Hospital & { travelTimeMinutes: number; compositeScore: number; route: RouteResult; hasRequiredSpecialty: boolean }>> {
    const res = await fetch(`${API_BASE}/hospitals/rank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emergencyLocationId, requiredSpecialty }),
    });
    if (!res.ok) throw new Error('Failed to rank hospitals');
    return res.json();
  },

  // Emergencies
  async getEmergencies(status?: string): Promise<Emergency[]> {
    const url = status ? `${API_BASE}/emergencies?status=${status}` : `${API_BASE}/emergencies`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch emergencies');
    return res.json();
  },

  async getPrioritizedEmergencies(): Promise<{
    prioritized: Emergency[];
    highestPriority: Emergency | null;
    totalCount: number;
    executionTimeMicroseconds?: number;
  }> {
    const res = await fetch(`${API_BASE}/emergencies/prioritized`);
    if (!res.ok) throw new Error('Failed to prioritize emergencies via C++ engine');
    return res.json();
  },

  async createEmergency(data: {
    title: string;
    patientName: string;
    callerContact?: string;
    severity: string;
    locationId: string;
    requiredSpecialty: string;
    notes?: string;
  }): Promise<Emergency> {
    const res = await fetch(`${API_BASE}/emergencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to register emergency');
    }
    return res.json();
  },

  // Route Planning (C++ Dijkstra)
  async calculateRoute(sourceId: string, destinationId: string): Promise<RouteResult> {
    const res = await fetch(`${API_BASE}/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, destinationId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to calculate shortest path');
    }
    return res.json();
  },

  // Graph Traversal (C++ BFS/DFS)
  async traverseGraph(startNodeId: string, algorithm: 'BFS' | 'DFS'): Promise<TraversalResult> {
    const res = await fetch(`${API_BASE}/graph/traverse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startNodeId, algorithm }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to traverse graph');
    }
    return res.json();
  },

  // Dispatches
  async getDispatches(): Promise<Dispatch[]> {
    const res = await fetch(`${API_BASE}/dispatches`);
    if (!res.ok) throw new Error('Failed to fetch dispatches');
    return res.json();
  },

  async createDispatch(data: { emergencyId: string; ambulanceId?: string; hospitalId?: string }): Promise<{
    success: boolean;
    message: string;
    dispatch: Dispatch;
    ambulanceLeg: RouteResult;
    hospitalLeg: RouteResult;
  }> {
    const res = await fetch(`${API_BASE}/dispatches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to dispatch ambulance');
    }
    return res.json();
  },

  async updateDispatchStatus(dispatchId: string, status: Dispatch['status']): Promise<Dispatch> {
    const res = await fetch(`${API_BASE}/dispatches/${dispatchId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update dispatch status');
    return res.json();
  },

  async completeMission(dispatchId: string): Promise<{ success: boolean; message: string; dispatch: Dispatch }> {
    const res = await fetch(`${API_BASE}/dispatches/${dispatchId}/complete`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to complete mission');
    }
    return res.json();
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  // Reset to Sample Data
  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/database/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset database');
    return res.json();
  },
};
