import React, { useState, useEffect, useCallback } from 'react';
import type {
  NavigationTab,
  LocationNode,
  RoadEdge,
  Ambulance,
  Hospital,
  Emergency,
  Dispatch,
  DashboardStats,
} from './types';
import { api } from './services/api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { EmergencyModal } from './components/EmergencyModal';
import { DispatchModal } from './components/DispatchModal';

// Pages
import { OverviewPage } from './pages/OverviewPage';
import { EmergenciesPage } from './pages/EmergenciesPage';
import { FleetPage } from './pages/FleetPage';
import { HospitalsPage } from './pages/HospitalsPage';
import { RoutePlannerPage } from './pages/RoutePlannerPage';
import { RoadNetworkPage } from './pages/RoadNetworkPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DocsPage } from './pages/DocsPage';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');

  // Application Data State
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [roads, setRoads] = useState<RoadEdge[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Status & Modals
  const [isLoading, setIsLoading] = useState(true);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [dispatchingEmergency, setDispatchingEmergency] = useState<Emergency | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch full system state
  const refreshAllData = useCallback(async () => {
    try {
      const [locs, rds, ambs, hosps, emgs, disps, st] = await Promise.all([
        api.getLocations(),
        api.getRoads(),
        api.getAmbulances(),
        api.getHospitals(),
        api.getEmergencies(),
        api.getDispatches(),
        api.getDashboardStats(),
      ]);

      setLocations(locs);
      setRoads(rds);
      setAmbulances(ambs);
      setHospitals(hosps);
      setEmergencies(emgs);
      setDispatches(disps);
      setStats(st);
      setIsLoading(false);
    } catch (err: any) {
      console.error('[RescueRoute] Failed to load initial state:', err);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Handle register emergency
  const handleRegisterEmergency = async (data: {
    title: string;
    patientName: string;
    callerContact: string;
    severity: Emergency['severity'];
    locationId: string;
    requiredSpecialty: string;
    notes: string;
  }) => {
    await api.createEmergency(data);
    await refreshAllData();
    showToast(`Emergency incident "${data.title}" enqueued into C++ Min-Heap.`);
  };

  // Handle road toggle (blocking / reopening)
  const handleToggleRoad = async (roadId: string) => {
    try {
      const res = await api.toggleRoad(roadId);
      await refreshAllData();
      showToast(res.message);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Handle ambulance status update
  const handleUpdateAmbulanceStatus = async (
    id: string,
    status: Ambulance['status'],
    currentLocationId?: string
  ) => {
    try {
      await api.updateAmbulanceStatus(id, status, currentLocationId);
      await refreshAllData();
      showToast(`Ambulance status updated to ${status}.`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Handle hospital bed adjustment
  const handleUpdateHospitalBeds = async (id: string, availableBeds: number) => {
    try {
      await api.updateHospitalBeds(id, availableBeds);
      await refreshAllData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Handle dispatch progress update
  const handleUpdateDispatchStatus = async (dispatchId: string, status: Dispatch['status']) => {
    try {
      await api.updateDispatchStatus(dispatchId, status);
      await refreshAllData();
      showToast(`Dispatch mission status updated to ${status}.`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Handle mission completion
  const handleCompleteMission = async (dispatchId: string) => {
    try {
      const res = await api.completeMission(dispatchId);
      await refreshAllData();
      showToast(res.message);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Quick process next priority emergency from C++ Min-Heap
  const handleProcessNextPriority = async () => {
    try {
      const { highestPriority } = await api.getPrioritizedEmergencies();
      if (!highestPriority) {
        showToast('No pending emergencies currently waiting in the priority queue.');
        return;
      }
      setDispatchingEmergency(highestPriority);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Reset database state
  const handleResetDatabase = async () => {
    if (window.confirm('Reset all simulated emergency records, fleet states, and road closures to the initial Pune dataset?')) {
      await api.resetDatabase();
      await refreshAllData();
      showToast('Database reset to initial sample state.');
    }
  };

  const pendingCount = emergencies.filter((e) => e.status === 'PENDING').length;
  const criticalCount = emergencies.filter((e) => e.severity === 'CRITICAL' && e.status === 'PENDING').length;
  const availableAmbulancesCount = ambulances.filter((a) => a.status === 'AVAILABLE').length;
  const blockedRoadsCount = roads.filter((r) => r.isBlocked).length;

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans antialiased text-slate-800">
      {/* Dark Navy Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pendingCount={pendingCount}
        availableAmbulancesCount={availableAmbulancesCount}
        blockedRoadsCount={blockedRoadsCount}
        onResetDatabase={handleResetDatabase}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onOpenNewEmergency={() => setIsEmergencyModalOpen(true)}
          onProcessNextPriority={pendingCount > 0 ? handleProcessNextPriority : undefined}
          criticalCount={criticalCount}
          onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold">Initializing RescueRoute DSA Core...</span>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewPage
                  locations={locations}
                  roads={roads}
                  ambulances={ambulances}
                  hospitals={hospitals}
                  emergencies={emergencies}
                  dispatches={dispatches}
                  stats={stats}
                  onDispatchClick={(emg) => setDispatchingEmergency(emg)}
                  onToggleRoad={handleToggleRoad}
                  onUpdateDispatchStatus={handleUpdateDispatchStatus}
                  onCompleteMission={handleCompleteMission}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'emergencies' && (
                <EmergenciesPage
                  emergencies={emergencies}
                  locations={locations}
                  onOpenNewModal={() => setIsEmergencyModalOpen(true)}
                  onDispatchClick={(emg) => setDispatchingEmergency(emg)}
                />
              )}

              {activeTab === 'fleet' && (
                <FleetPage
                  ambulances={ambulances}
                  locations={locations}
                  onUpdateStatus={handleUpdateAmbulanceStatus}
                />
              )}

              {activeTab === 'hospitals' && (
                <HospitalsPage
                  hospitals={hospitals}
                  locations={locations}
                  onUpdateBeds={handleUpdateHospitalBeds}
                />
              )}

              {activeTab === 'route-planner' && (
                <RoutePlannerPage
                  locations={locations}
                  roads={roads}
                  onToggleRoad={handleToggleRoad}
                />
              )}

              {activeTab === 'road-network' && (
                <RoadNetworkPage
                  locations={locations}
                  roads={roads}
                  onToggleRoad={handleToggleRoad}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsPage
                  emergencies={emergencies}
                  ambulances={ambulances}
                  hospitals={hospitals}
                  dispatches={dispatches}
                  stats={stats}
                />
              )}

              {activeTab === 'docs' && <DocsPage />}
            </>
          )}
        </main>
      </div>

      {/* Register Emergency Modal */}
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        locations={locations}
        onSubmit={handleRegisterEmergency}
      />

      {/* Algorithmic Dispatch Modal */}
      <DispatchModal
        isOpen={!!dispatchingEmergency}
        onClose={() => setDispatchingEmergency(null)}
        emergency={dispatchingEmergency}
        locations={locations}
        onDispatchSuccess={() => {
          refreshAllData();
          showToast('Ambulance dispatched successfully via C++ Dijkstra shortest path!');
        }}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[9999] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
