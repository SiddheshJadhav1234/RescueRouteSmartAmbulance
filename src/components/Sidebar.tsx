import React from 'react';
import type { NavigationTab } from '../types';
import {
  Activity,
  AlertCircle,
  Truck,
  Building2,
  Navigation,
  Network,
  BarChart3,
  BookOpen,
  Cpu,
  RefreshCw,
} from 'lucide-react';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  pendingCount?: number;
  availableAmbulancesCount?: number;
  blockedRoadsCount?: number;
  onResetDatabase?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pendingCount = 0,
  availableAmbulancesCount = 0,
  blockedRoadsCount = 0,
  onResetDatabase,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
  }> = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: 'emergencies',
      label: 'Emergency Queue',
      icon: <AlertCircle className="w-4 h-4" />,
      badge: pendingCount,
      badgeColor: pendingCount > 0 ? 'bg-red-500 text-white' : undefined,
    },
    {
      id: 'fleet',
      label: 'Ambulance Fleet',
      icon: <Truck className="w-4 h-4" />,
      badge: `${availableAmbulancesCount} avail`,
      badgeColor: 'bg-emerald-500/20 text-emerald-400',
    },
    {
      id: 'hospitals',
      label: 'Hospitals',
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      id: 'route-planner',
      label: 'Route Planner (Dijkstra)',
      icon: <Navigation className="w-4 h-4" />,
    },
    {
      id: 'road-network',
      label: 'Roads & BFS/DFS',
      icon: <Network className="w-4 h-4" />,
      badge: blockedRoadsCount > 0 ? `${blockedRoadsCount} blocked` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-400',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'docs',
      label: 'DSA & Viva Docs',
      icon: <BookOpen className="w-4 h-4" />,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none text-slate-300 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand / Logo */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  Rescue<span className="text-blue-400">Route</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                  C++ DSA Emergency Core
                </div>
              </div>
            </div>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="md:hidden text-slate-400 hover:text-white p-1"
                aria-label="Close menu"
              >
                ✕
              </button>
            )}
          </div>

        {/* Engine status chip */}
        <div className="px-4 py-2.5 mx-3 mt-3 bg-slate-800/60 rounded-lg border border-slate-700/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-mono text-[11px]">C++17 Engine</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
            Active
          </span>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Info */}
      <div className="p-4 border-t border-slate-800/80 space-y-3">
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1">
          <div className="text-slate-400 flex justify-between">
            <span>Algorithm:</span>
            <span className="font-mono text-blue-400 font-medium">Dijkstra + Heap</span>
          </div>
          <div className="text-slate-400 flex justify-between">
            <span>Complexity:</span>
            <span className="font-mono text-emerald-400 font-medium">O((V+E)logV)</span>
          </div>
          <div className="text-slate-400 flex justify-between">
            <span>City Simulation:</span>
            <span className="font-mono text-slate-200">Pune Metro</span>
          </div>
        </div>

        {onResetDatabase && (
          <button
            onClick={onResetDatabase}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 py-2 rounded-lg border border-slate-700/60 transition"
          >
            <RefreshCw className="w-3 h-3" />
            Reset Sample Data
          </button>
        )}
      </div>
    </aside>
  </>
  );
};
