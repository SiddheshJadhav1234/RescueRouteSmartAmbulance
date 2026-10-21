import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { dbService } from '../services/dbService.js';
import { dsaService } from '../services/dsaService.js';
import type { EmergencySeverity } from '../types.js';

export const apiRouter = Router();

// Validation Schemas
const CreateEmergencySchema = z.object({
  title: z.string().min(3, 'Emergency title must be at least 3 characters'),
  patientName: z.string().min(2, 'Patient name is required'),
  callerContact: z.string().optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  locationId: z.string().min(1, 'Location is required'),
  requiredSpecialty: z.string().min(1, 'Required medical specialty is required'),
  notes: z.string().optional(),
});

const CalculateRouteSchema = z.object({
  sourceId: z.string().min(1, 'Source location is required'),
  destinationId: z.string().min(1, 'Destination location is required'),
});

const TraverseGraphSchema = z.object({
  startNodeId: z.string().min(1, 'Start node ID is required'),
  algorithm: z.enum(['BFS', 'DFS']),
});

const CreateDispatchSchema = z.object({
  emergencyId: z.string().min(1, 'Emergency ID is required'),
  ambulanceId: z.string().optional(), // if not provided, best ranked by C++ Dijkstra is auto-selected
  hospitalId: z.string().optional(),  // if not provided, best ranked hospital is auto-selected
});

// 1. Health check
apiRouter.get('/health', async (_req: Request, res: Response) => {
  const dsaHealth = await dsaService.checkHealth();
  res.json({
    status: 'HEALTHY',
    service: 'RescueRoute Emergency Dispatch Core',
    timestamp: new Date().toISOString(),
    dsaEngine: dsaHealth,
    database: {
      mode: dbService.isUsingSupabase() ? 'Supabase PostgreSQL' : 'Self-Contained In-Memory Simulation',
      connected: true,
    },
  });
});

// 2. Locations
apiRouter.get('/locations', async (_req: Request, res: Response) => {
  const locations = await dbService.getLocations();
  res.json(locations);
});

// 3. Roads
apiRouter.get('/roads', async (_req: Request, res: Response) => {
  const roads = await dbService.getRoads();
  res.json(roads);
});

apiRouter.post('/roads/:id/toggle', async (req: Request, res: Response) => {
  try {
    const updated = await dbService.toggleRoadBlocked(req.params.id);
    res.json({
      success: true,
      message: `Road '${updated.roadName}' is now ${updated.isBlocked ? 'BLOCKED' : 'OPEN'}.`,
      road: updated,
    });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// 4. Ambulances
apiRouter.get('/ambulances', async (_req: Request, res: Response) => {
  const ambulances = await dbService.getAmbulances();
  res.json(ambulances);
});

apiRouter.put('/ambulances/:id/status', async (req: Request, res: Response) => {
  const { status, currentLocationId } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  try {
    const updated = await dbService.updateAmbulanceStatus(req.params.id, status, currentLocationId);
    res.json(updated);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// 5. Hospitals
apiRouter.get('/hospitals', async (_req: Request, res: Response) => {
  const hospitals = await dbService.getHospitals();
  res.json(hospitals);
});

apiRouter.put('/hospitals/:id/beds', async (req: Request, res: Response) => {
  const { availableBeds } = req.body;
  if (typeof availableBeds !== 'number') {
    return res.status(400).json({ error: 'availableBeds number is required' });
  }
  try {
    const updated = await dbService.updateHospitalBeds(req.params.id, availableBeds);
    res.json(updated);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// 6. Emergencies
apiRouter.get('/emergencies', async (req: Request, res: Response) => {
  const status = req.query.status as any;
  const emergencies = await dbService.getEmergencies(status);
  res.json(emergencies);
});

apiRouter.post('/emergencies', async (req: Request, res: Response) => {
  const parse = CreateEmergencySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.issues[0].message });
  }

  const newEmergency = await dbService.createEmergency({
    ...parse.data,
    status: 'PENDING',
  });

  res.status(201).json(newEmergency);
});

// 7. C++ Emergency Priority Queue
apiRouter.get('/emergencies/prioritized', async (_req: Request, res: Response) => {
  try {
    // Only pending emergencies are enqueued for dispatch
    const pending = await dbService.getEmergencies('PENDING');
    const prioritizedResult = await dsaService.prioritizeEmergencies(pending);
    res.json(prioritizedResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. C++ Dijkstra Route Calculation
apiRouter.post('/routes/calculate', async (req: Request, res: Response) => {
  const parse = CalculateRouteSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.issues[0].message });
  }

  try {
    const locations = await dbService.getLocations();
    const roads = await dbService.getRoads();
    const route = await dsaService.calculateRoute(
      locations,
      roads,
      parse.data.sourceId,
      parse.data.destinationId
    );
    res.json(route);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. C++ Graph Traversal (BFS & DFS)
apiRouter.post('/graph/traverse', async (req: Request, res: Response) => {
  const parse = TraverseGraphSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.issues[0].message });
  }

  try {
    const locations = await dbService.getLocations();
    const roads = await dbService.getRoads();
    if (parse.data.algorithm === 'BFS') {
      const bfsResult = await dsaService.traverseBFS(locations, roads, parse.data.startNodeId);
      res.json(bfsResult);
    } else {
      const dfsResult = await dsaService.traverseDFS(locations, roads, parse.data.startNodeId);
      res.json(dfsResult);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Rank Ambulances for an Emergency
apiRouter.post('/ambulances/rank', async (req: Request, res: Response) => {
  const { emergencyLocationId } = req.body;
  if (!emergencyLocationId) {
    return res.status(400).json({ error: 'emergencyLocationId is required' });
  }

  try {
    const locations = await dbService.getLocations();
    const roads = await dbService.getRoads();
    const ambulances = await dbService.getAmbulances();
    const ranked = await dsaService.rankAmbulances(locations, roads, emergencyLocationId, ambulances);
    res.json(ranked);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Rank Hospitals for an Emergency
apiRouter.post('/hospitals/rank', async (req: Request, res: Response) => {
  const { emergencyLocationId, requiredSpecialty } = req.body;
  if (!emergencyLocationId) {
    return res.status(400).json({ error: 'emergencyLocationId is required' });
  }

  try {
    const locations = await dbService.getLocations();
    const roads = await dbService.getRoads();
    const hospitals = await dbService.getHospitals();
    const ranked = await dsaService.rankHospitals(
      locations,
      roads,
      emergencyLocationId,
      requiredSpecialty || '',
      hospitals
    );
    res.json(ranked);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Full End-to-End Dispatch Mission Execution
apiRouter.get('/dispatches', async (_req: Request, res: Response) => {
  const dispatches = await dbService.getDispatches();
  res.json(dispatches);
});

apiRouter.post('/dispatches', async (req: Request, res: Response) => {
  const parse = CreateDispatchSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.issues[0].message });
  }

  const { emergencyId } = parse.data;

  try {
    const emergency = await dbService.getEmergencyById(emergencyId);
    if (!emergency) {
      return res.status(404).json({ error: `Emergency '${emergencyId}' not found.` });
    }
    if (emergency.status !== 'PENDING') {
      return res.status(400).json({ error: `Emergency '${emergencyId}' is not pending (status: ${emergency.status}).` });
    }

    const locations = await dbService.getLocations();
    const roads = await dbService.getRoads();
    const allAmbulances = await dbService.getAmbulances();
    const allHospitals = await dbService.getHospitals();

    // 1. Determine Ambulance: User specified or best ranked via C++ Dijkstra
    let chosenAmbulanceId = parse.data.ambulanceId;
    let ambulanceRoute: any = null;

    if (!chosenAmbulanceId) {
      const availableAmbs = allAmbulances.filter((a) => a.status === 'AVAILABLE');
      if (availableAmbs.length === 0) {
        return res.status(400).json({
          error: 'No available ambulances in the fleet. Please wait for an active mission to complete or update fleet status.',
        });
      }

      const rankedAmbs = await dsaService.rankAmbulances(locations, roads, emergency.locationId, availableAmbs);
      const eligible = rankedAmbs.find((a) => a.route && a.route.hasPath && Number.isFinite(a.etaMinutes));

      if (!eligible) {
        return res.status(400).json({
          error: 'Road network disconnection: No navigable route exists from any available ambulance to the emergency location.',
        });
      }

      chosenAmbulanceId = eligible.id;
      ambulanceRoute = eligible.route;
    } else {
      const amb = allAmbulances.find((a) => a.id === chosenAmbulanceId);
      if (!amb) {
        return res.status(404).json({ error: `Ambulance '${chosenAmbulanceId}' not found.` });
      }
      if (amb.status !== 'AVAILABLE') {
        return res.status(400).json({
          error: `Double-booking prevention: Ambulance ${amb.vehicleNumber} is currently ${amb.status}.`,
        });
      }
      ambulanceRoute = await dsaService.calculateRoute(locations, roads, amb.currentLocationId, emergency.locationId);
      if (!ambulanceRoute.hasPath) {
        return res.status(400).json({
          error: `Cannot dispatch: No navigable path exists from ambulance location to emergency. (${ambulanceRoute.errorMessage || 'Road blocked'})`,
        });
      }
    }

    // 2. Determine Hospital: User specified or best ranked via C++ scoring
    let chosenHospitalId = parse.data.hospitalId;
    let hospitalRoute: any = null;

    if (!chosenHospitalId) {
      const rankedHosps = await dsaService.rankHospitals(
        locations,
        roads,
        emergency.locationId,
        emergency.requiredSpecialty,
        allHospitals
      );
      const eligibleHosp = rankedHosps.find((h) => h.route && h.route.hasPath);
      if (!eligibleHosp) {
        return res.status(400).json({
          error: 'No reachable hospital with available route found for this emergency.',
        });
      }
      chosenHospitalId = eligibleHosp.id;
      hospitalRoute = eligibleHosp.route;
    } else {
      const hosp = allHospitals.find((h) => h.id === chosenHospitalId);
      if (!hosp) {
        return res.status(404).json({ error: `Hospital '${chosenHospitalId}' not found.` });
      }
      hospitalRoute = await dsaService.calculateRoute(locations, roads, emergency.locationId, hosp.locationId);
      if (!hospitalRoute.hasPath) {
        return res.status(400).json({
          error: `Cannot route to hospital: No navigable path exists from emergency to hospital.`,
        });
      }
    }

    // Combine route steps for end-to-end mission (Ambulance -> Patient -> Hospital)
    const combinedPath = [
      ...ambulanceRoute.path,
      ...hospitalRoute.path.slice(1), // omit duplicate patient node
    ];
    const combinedSteps = [...ambulanceRoute.steps, ...hospitalRoute.steps];
    const totalTime = ambulanceRoute.totalTravelTimeMinutes + hospitalRoute.totalTravelTimeMinutes;
    const totalDist = ambulanceRoute.totalDistanceKm + hospitalRoute.totalDistanceKm;

    // Atomically create dispatch and lock ambulance
    const dispatch = await dbService.createDispatchAtomic({
      emergencyId: emergency.id,
      ambulanceId: chosenAmbulanceId,
      hospitalId: chosenHospitalId,
      totalTravelTimeMinutes: totalTime,
      totalDistanceKm: totalDist,
      dijkstraPath: combinedPath,
      steps: combinedSteps,
    });

    res.status(201).json({
      success: true,
      message: 'Ambulance successfully dispatched via C++ Dijkstra shortest path!',
      dispatch,
      ambulanceLeg: ambulanceRoute,
      hospitalLeg: hospitalRoute,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Update dispatch progress
apiRouter.put('/dispatches/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  try {
    const updated = await dbService.updateDispatchStatus(req.params.id, status);
    res.json(updated);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// 14. Complete Mission
apiRouter.post('/dispatches/:id/complete', async (req: Request, res: Response) => {
  try {
    const completed = await dbService.updateDispatchStatus(req.params.id, 'COMPLETED');
    res.json({
      success: true,
      message: 'Mission successfully completed. Ambulance released back to available fleet.',
      dispatch: completed,
    });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// 15. Dashboard Aggregated Live Stats
apiRouter.get('/dashboard/stats', async (_req: Request, res: Response) => {
  const emergencies = await dbService.getEmergencies();
  const ambulances = await dbService.getAmbulances();
  const dispatches = await dbService.getDispatches();
  const roads = await dbService.getRoads();
  const hospitals = await dbService.getHospitals();

  const totalEmergencies = emergencies.length;
  const pendingEmergencies = emergencies.filter((e) => e.status === 'PENDING').length;
  const criticalEmergencies = emergencies.filter((e) => e.severity === 'CRITICAL' && e.status === 'PENDING').length;
  const availableAmbulances = ambulances.filter((a) => a.status === 'AVAILABLE').length;
  const activeDispatches = dispatches.filter((d) => d.status !== 'COMPLETED' && d.status !== 'CANCELLED').length;
  const completedMissions = dispatches.filter((d) => d.status === 'COMPLETED').length;
  const blockedRoadsCount = roads.filter((r) => r.isBlocked).length;

  const totalHospitalBeds = hospitals.reduce((sum, h) => sum + h.totalBeds, 0);
  const availableHospitalBeds = hospitals.reduce((sum, h) => sum + h.availableBeds, 0);

  // Calculate average response time of dispatches
  const avgResponseTimeMinutes =
    dispatches.length > 0
      ? Number((dispatches.reduce((sum, d) => sum + d.totalTravelTimeMinutes, 0) / dispatches.length).toFixed(1))
      : 8.5;

  res.json({
    totalEmergencies,
    pendingEmergencies,
    criticalEmergencies,
    availableAmbulances,
    totalAmbulances: ambulances.length,
    activeDispatches,
    completedMissions,
    blockedRoadsCount,
    totalRoads: roads.length,
    totalHospitalBeds,
    availableHospitalBeds,
    avgResponseTimeMinutes,
    severityBreakdown: {
      CRITICAL: emergencies.filter((e) => e.severity === 'CRITICAL').length,
      HIGH: emergencies.filter((e) => e.severity === 'HIGH').length,
      MEDIUM: emergencies.filter((e) => e.severity === 'MEDIUM').length,
      LOW: emergencies.filter((e) => e.severity === 'LOW').length,
    },
  });
});

// 16. Reset database
apiRouter.post('/database/reset', async (_req: Request, res: Response) => {
  await dbService.resetDatabase();
  res.json({ success: true, message: 'Database reset to initial deterministic Pune simulation state.' });
});
