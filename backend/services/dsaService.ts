import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { LocationNode, RoadEdge, RouteResult, TraversalResult, Emergency, Ambulance, Hospital } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate the compiled C++ executable
function getEnginePath(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), 'cpp-engine/build/rescueroute_engine'),
    path.resolve(process.cwd(), 'cpp-engine/rescueroute_engine'),
    path.resolve(__dirname, '../../cpp-engine/build/rescueroute_engine'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return possiblePaths[0]; // fallback
}

interface DsaEngineResponse<T = any> {
  success: boolean;
  operation: string;
  result?: T;
  prioritized?: any[];
  highestPriority?: any;
  ranked?: any[];
  totalCount?: number;
  error?: string;
  executionTimeMicroseconds?: number;
}

export class DsaService {
  private engineBinaryPath: string;

  constructor() {
    this.engineBinaryPath = getEnginePath();
  }

  /**
   * Core invocation method: passes request payload via stdin and awaits stdout JSON.
   */
  private async executeEngine<T>(payload: Record<string, any>, timeoutMs = 8000): Promise<DsaEngineResponse<T>> {
    if (!fs.existsSync(this.engineBinaryPath)) {
      throw new Error(`C++ DSA Engine executable not found at specified binary location.`);
    }

    return new Promise((resolve, reject) => {
      // Use argument array (not shell concatenation)
      const child = spawn(this.engineBinaryPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdoutData = '';
      let stderrData = '';
      let timer: NodeJS.Timeout | null = null;

      timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`C++ DSA Engine execution timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      child.on('error', (err) => {
        if (timer) clearTimeout(timer);
        reject(new Error(`Failed to invoke C++ DSA Engine process: ${err.message}`));
      });

      child.on('close', (code) => {
        if (timer) clearTimeout(timer);

        if (stderrData.trim()) {
          // Internal server log only - not exposed directly to end-user
          console.warn(`[C++ Engine Stderr]`, stderrData.trim());
        }

        if (code !== 0 && !stdoutData.trim()) {
          return reject(new Error(`C++ DSA Engine terminated with non-zero exit code: ${code}`));
        }

        try {
          const parsed = JSON.parse(stdoutData.trim()) as DsaEngineResponse<T>;
          resolve(parsed);
        } catch (err: any) {
          reject(new Error(`Failed to parse C++ DSA Engine output: ${err.message}`));
        }
      });

      // Send payload via stdin and close input
      try {
        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();
      } catch (err: any) {
        if (timer) clearTimeout(timer);
        reject(new Error(`Failed to write request to C++ DSA Engine: ${err.message}`));
      }
    });
  }

  /**
   * Health check for C++ DSA Engine
   */
  async checkHealth(): Promise<{ healthy: boolean; details?: any; error?: string }> {
    try {
      const resp = await this.executeEngine({ operation: 'health' });
      return {
        healthy: resp.success === true,
        details: resp,
      };
    } catch (err: any) {
      return {
        healthy: false,
        error: err.message,
      };
    }
  }

  /**
   * Calculates shortest path using C++ Dijkstra algorithm with custom Min-Heap
   */
  async calculateRoute(
    locations: LocationNode[],
    roads: RoadEdge[],
    sourceId: string,
    destinationId: string
  ): Promise<RouteResult> {
    const resp = await this.executeEngine<RouteResult>({
      operation: 'calculate_route',
      locations,
      roads,
      sourceId,
      destinationId,
    });

    if (!resp.success || !resp.result) {
      throw new Error(resp.error || 'Dijkstra route calculation failed.');
    }

    return resp.result;
  }

  /**
   * Runs BFS graph traversal from a start node using C++ engine
   */
  async traverseBFS(
    locations: LocationNode[],
    roads: RoadEdge[],
    startNodeId: string
  ): Promise<TraversalResult> {
    const resp = await this.executeEngine<TraversalResult>({
      operation: 'traverse_bfs',
      locations,
      roads,
      startNodeId,
    });

    if (!resp.success || !resp.result) {
      throw new Error(resp.error || 'BFS traversal failed.');
    }

    return resp.result;
  }

  /**
   * Runs DFS graph traversal from a start node using C++ engine
   */
  async traverseDFS(
    locations: LocationNode[],
    roads: RoadEdge[],
    startNodeId: string
  ): Promise<TraversalResult> {
    const resp = await this.executeEngine<TraversalResult>({
      operation: 'traverse_dfs',
      locations,
      roads,
      startNodeId,
    });

    if (!resp.success || !resp.result) {
      throw new Error(resp.error || 'DFS traversal failed.');
    }

    return resp.result;
  }

  /**
   * Sorts and prioritizes emergencies using the C++ custom MinHeap Priority Queue
   */
  async prioritizeEmergencies(emergencies: Emergency[]): Promise<{
    prioritized: Emergency[];
    highestPriority: Emergency | null;
    totalCount: number;
    executionTimeMicroseconds?: number;
  }> {
    const resp = await this.executeEngine({
      operation: 'prioritize_emergencies',
      emergencies,
    });

    if (!resp.success) {
      throw new Error(resp.error || 'Emergency prioritization failed.');
    }

    return {
      prioritized: resp.prioritized || [],
      highestPriority: resp.highestPriority || null,
      totalCount: resp.totalCount || 0,
      executionTimeMicroseconds: resp.executionTimeMicroseconds,
    };
  }

  /**
   * Ranks available ambulances for an emergency by ETA using C++ Dijkstra shortest paths
   */
  async rankAmbulances(
    locations: LocationNode[],
    roads: RoadEdge[],
    emergencyLocationId: string,
    ambulances: Ambulance[]
  ): Promise<Array<Ambulance & { etaMinutes: number; route: RouteResult }>> {
    const resp = await this.executeEngine({
      operation: 'rank_ambulances',
      locations,
      roads,
      emergencyLocationId,
      ambulances,
    });

    if (!resp.success || !resp.ranked) {
      throw new Error(resp.error || 'Ambulance ranking failed.');
    }

    return resp.ranked;
  }

  /**
   * Ranks hospitals by travel time, bed availability, and specialty capability
   */
  async rankHospitals(
    locations: LocationNode[],
    roads: RoadEdge[],
    emergencyLocationId: string,
    requiredSpecialty: string,
    hospitals: Hospital[]
  ): Promise<Array<Hospital & { travelTimeMinutes: number; compositeScore: number; route: RouteResult; hasRequiredSpecialty: boolean }>> {
    const resp = await this.executeEngine({
      operation: 'rank_hospitals',
      locations,
      roads,
      emergencyLocationId,
      requiredSpecialty,
      hospitals,
    });

    if (!resp.success || !resp.ranked) {
      throw new Error(resp.error || 'Hospital ranking failed.');
    }

    return resp.ranked;
  }
}

export const dsaService = new DsaService();
