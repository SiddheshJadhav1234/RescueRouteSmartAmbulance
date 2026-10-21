import React, { useState } from 'react';
import type { LocationNode, RoadEdge, TraversalResult } from '../types';
import { api } from '../services/api';
import {
  Network,
  AlertTriangle,
  Layers,
  ArrowRight,
  Play,
  RotateCcw,
  CheckCircle2,
  GitFork,
  MapPin,
} from 'lucide-react';

interface RoadNetworkPageProps {
  locations: LocationNode[];
  roads: RoadEdge[];
  onToggleRoad: (roadId: string) => Promise<void>;
}

export const RoadNetworkPage: React.FC<RoadNetworkPageProps> = ({
  locations,
  roads,
  onToggleRoad,
}) => {
  const [startNodeId, setStartNodeId] = useState<string>(locations[0]?.id || 'LOC_HINJEWADI');
  const [algorithm, setAlgorithm] = useState<'BFS' | 'DFS'>('BFS');
  const [traversalResult, setTraversalResult] = useState<TraversalResult | null>(null);
  const [isTraversing, setIsTraversing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locMap = new Map<string, string>();
  locations.forEach((l) => locMap.set(l.id, l.name));

  const handleRunTraversal = async () => {
    try {
      setIsTraversing(true);
      setError(null);
      const res = await api.traverseGraph(startNodeId, algorithm);
      setTraversalResult(res);
    } catch (err: any) {
      setError(err.message || 'Graph traversal failed');
    } finally {
      setIsTraversing(false);
    }
  };

  const blockedCount = roads.filter((r) => r.isBlocked).length;

  return (
    <div className="space-y-6">
      {/* 1. BFS & DFS Graph Traversal Visualizer Tool */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Graph Traversal Visualizer (C++ Engine)</h2>
                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30">
                  Adjacency List Graph
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Execute Breadth-First Search (Queue / Level-by-Level) or Depth-First Search (Recursive Stack) across Pune roads
              </p>
            </div>
          </div>

          <button
            onClick={handleRunTraversal}
            disabled={isTraversing}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isTraversing ? 'Running in C++...' : `Execute C++ ${algorithm}`}</span>
          </button>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Starting Vertex (Root Node)</span>
            </label>
            <select
              value={startNodeId}
              onChange={(e) => setStartNodeId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.zone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Traversal Algorithm
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAlgorithm('BFS')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                  algorithm === 'BFS'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>BFS (Breadth-First)</span>
              </button>

              <button
                type="button"
                onClick={() => setAlgorithm('DFS')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                  algorithm === 'DFS'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900'
                }`}
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>DFS (Depth-First)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Traversal Results Display */}
        {traversalResult && (
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-400">
                {traversalResult.algorithm} Visited {traversalResult.visitOrder.length} of {locations.length} Locations
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Root: {locMap.get(traversalResult.startNodeId)}
              </span>
            </div>

            {/* Step-by-step traversal pill sequence */}
            <div className="flex flex-wrap items-center gap-2">
              {traversalResult.visitOrder.map((nodeId, idx) => (
                <React.Fragment key={nodeId}>
                  <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-100">{locMap.get(nodeId)?.split(' ')[0]}</span>
                    {idx === 0 && <span className="text-[9px] text-blue-300">(Start)</span>}
                  </div>
                  {idx < traversalResult.visitOrder.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Depth / Hierarchy Table */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-900">
              {traversalResult.visitSteps.map((step, idx) => (
                <div key={idx} className="bg-slate-900/60 p-2 rounded text-[11px] border border-slate-800">
                  <div className="font-semibold text-slate-200">{locMap.get(step.nodeId)}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between">
                    <span>Depth: <b>{step.depth}</b></span>
                    <span>Parent: <b>{step.parent ? locMap.get(step.parent)?.split(' ')[0] : 'None'}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Road Network Table & Blocking Controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-50/60">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Road Corridors & Dynamic Obstruction Controls</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click "Block Road" on any corridor to simulate emergency road closures, landslides, or VIP traffic blocks
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              Total: {roads.length} Roads
            </span>
            {blockedCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                {blockedCount} Blocked
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Road ID</th>
                <th className="px-4 py-3">Corridor Name</th>
                <th className="px-4 py-3">Source Node</th>
                <th className="px-4 py-3">Destination Node</th>
                <th className="px-4 py-3">Distance (km)</th>
                <th className="px-4 py-3">Base Travel Time</th>
                <th className="px-4 py-3">Graph Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roads.map((road) => (
                <tr
                  key={road.id}
                  className={`hover:bg-slate-50/80 transition ${
                    road.isBlocked ? 'bg-red-50/40 text-red-900' : 'text-slate-800'
                  }`}
                >
                  <td className="px-4 py-3 font-mono font-bold text-slate-500">{road.id}</td>
                  <td className="px-4 py-3 font-bold">{road.roadName}</td>
                  <td className="px-4 py-3">{locMap.get(road.source)}</td>
                  <td className="px-4 py-3">{locMap.get(road.target)}</td>
                  <td className="px-4 py-3">{road.distanceKm} km</td>
                  <td className="px-4 py-3 font-semibold">{road.travelTimeMinutes} min</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${
                        road.isBlocked
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {road.isBlocked ? 'BLOCKED' : 'OPEN'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onToggleRoad(road.id)}
                      className={`px-3 py-1 rounded text-[11px] font-bold transition shadow-2xs ${
                        road.isBlocked
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {road.isBlocked ? 'Reopen Road' : 'Block Road'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
