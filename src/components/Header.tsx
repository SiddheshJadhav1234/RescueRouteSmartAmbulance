import React from 'react';
import { PlusCircle, Siren, Database, CheckCircle2, ShieldAlert, Menu } from 'lucide-react';
import type { NavigationTab } from '../types';

interface HeaderProps {
  activeTab: NavigationTab;
  onOpenNewEmergency: () => void;
  onProcessNextPriority?: () => void;
  criticalCount?: number;
  isSupabase?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenNewEmergency,
  onProcessNextPriority,
  criticalCount = 0,
  isSupabase = false,
  onToggleMobileMenu,
}) => {
  const titles: Record<NavigationTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Emergency Operations Command',
      subtitle: 'Real-time citywide ambulance dispatch, road obstruction monitoring, and graph routing',
    },
    emergencies: {
      title: 'Emergency Priority Queue',
      subtitle: 'Managed using custom C++ Binary Min-Heap sorted by Severity (Critical > High > Medium > Low) and FIFO timestamp',
    },
    fleet: {
      title: 'Ambulance Fleet Status',
      subtitle: 'Real-time vehicle availability, Advanced Life Support (ALS) equipment, and driver assignments',
    },
    hospitals: {
      title: 'Hospital Capacity & Specialties',
      subtitle: 'Live bed availability, ICU occupancy, and specialty matching for trauma, cardiology, and oncology',
    },
    'route-planner': {
      title: 'Dijkstra Shortest Path Planner',
      subtitle: 'Interactive testbench for C++ Dijkstra algorithm with real-time road closure recalculations',
    },
    'road-network': {
      title: 'Road Network & Graph Traversals',
      subtitle: 'Adjacency list graph manipulation, real-time road obstruction toggles, and BFS/DFS visualizer',
    },
    analytics: {
      title: 'System Analytics & Performance',
      subtitle: 'Dispatch metrics, emergency distribution, response times, and algorithmic time complexity',
    },
    docs: {
      title: 'Academic DSA Documentation & Viva Q&A',
      subtitle: 'In-depth explanation of Data Structures, Algorithms, C++ implementation, and college defense prep',
    },
  };

  const current = titles[activeTab] || titles.overview;

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      <div className="flex items-start md:items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 mt-0.5"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{current.title}</h1>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse border border-red-200">
              <ShieldAlert className="w-3.5 h-3.5" />
              {criticalCount} Critical
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{current.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Database status pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-medium">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>{isSupabase ? 'Supabase PostgreSQL' : 'PostgreSQL Mode'}</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        </div>

        {onProcessNextPriority && (
          <button
            onClick={onProcessNextPriority}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition"
            title="Automatically dispatch the highest priority pending emergency using C++ MinHeap and Dijkstra"
          >
            <Siren className="w-4 h-4 animate-bounce" />
            <span>Process Next Priority</span>
          </button>
        )}

        <button
          onClick={onOpenNewEmergency}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register Emergency</span>
        </button>
      </div>
    </header>
  );
};
