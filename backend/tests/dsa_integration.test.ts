import test from 'node:test';
import assert from 'node:assert/strict';
import { dsaService } from '../services/dsaService.js';
import { dbService } from '../services/dbService.js';
import type { LocationNode, RoadEdge, Emergency } from '../types.js';

test('C++ DSA Engine health check responds OK', async () => {
  const health = await dsaService.checkHealth();
  assert.equal(health.healthy, true, 'Engine should be healthy');
  assert.equal(health.details?.status, 'OK');
  assert.equal(health.details?.engine, 'RescueRoute C++17 DSA Engine v1.0.0');
});

test('Dijkstra finds direct shortest path between Hinjewadi and Wakad', async () => {
  const locations: LocationNode[] = [
    { id: 'HINJEWADI', name: 'Hinjewadi', zone: 'West', lat: 18.59, lng: 73.73 },
    { id: 'WAKAD', name: 'Wakad', zone: 'West', lat: 18.60, lng: 73.76 },
  ];
  const roads: RoadEdge[] = [
    { id: 'R1', source: 'HINJEWADI', target: 'WAKAD', roadName: 'Bridge', distanceKm: 4.5, travelTimeMinutes: 8.0, isBlocked: false, isBidirectional: true },
  ];

  const route = await dsaService.calculateRoute(locations, roads, 'HINJEWADI', 'WAKAD');
  assert.equal(route.hasPath, true);
  assert.equal(route.totalTravelTimeMinutes, 8.0);
  assert.deepEqual(route.path, ['HINJEWADI', 'WAKAD']);
});

test('Dijkstra recalculates alternate route when a road is blocked', async () => {
  const locations: LocationNode[] = [
    { id: 'A', name: 'Node A', zone: 'West', lat: 18.5, lng: 73.7 },
    { id: 'B', name: 'Node B', zone: 'West', lat: 18.6, lng: 73.7 },
    { id: 'C', name: 'Node C', zone: 'West', lat: 18.7, lng: 73.7 },
  ];

  // Direct route A -> C (10 min) vs detour A -> B (4 min) + B -> C (8 min) = 12 min
  const roadsOpen: RoadEdge[] = [
    { id: 'R_DIRECT', source: 'A', target: 'C', roadName: 'Direct Highway', distanceKm: 8, travelTimeMinutes: 10.0, isBlocked: false, isBidirectional: true },
    { id: 'R_AB', source: 'A', target: 'B', roadName: 'A to B', distanceKm: 3, travelTimeMinutes: 4.0, isBlocked: false, isBidirectional: true },
    { id: 'R_BC', source: 'B', target: 'C', roadName: 'B to C', distanceKm: 6, travelTimeMinutes: 8.0, isBlocked: false, isBidirectional: true },
  ];

  // When open: chooses direct path A -> C
  const routeOpen = await dsaService.calculateRoute(locations, roadsOpen, 'A', 'C');
  assert.equal(routeOpen.hasPath, true);
  assert.equal(routeOpen.totalTravelTimeMinutes, 10.0);
  assert.deepEqual(routeOpen.path, ['A', 'C']);

  // When direct road is blocked: dynamically recalculates detour A -> B -> C (12 min)
  const roadsBlocked: RoadEdge[] = roadsOpen.map((r) =>
    r.id === 'R_DIRECT' ? { ...r, isBlocked: true } : r
  );
  const routeDetour = await dsaService.calculateRoute(locations, roadsBlocked, 'A', 'C');
  assert.equal(routeDetour.hasPath, true);
  assert.equal(routeDetour.totalTravelTimeMinutes, 12.0);
  assert.deepEqual(routeDetour.path, ['A', 'B', 'C']);
});

test('C++ Emergency Priority Queue orders emergencies: CRITICAL > HIGH > MEDIUM > LOW', async () => {
  const emergencies: Emergency[] = [
    { id: 'E1', title: 'Fever', patientName: 'P1', severity: 'LOW', locationId: 'A', requiredSpecialty: 'General', status: 'PENDING', reportedAt: new Date().toISOString(), reportedAtTimestamp: 1000 },
    { id: 'E2', title: 'Fracture', patientName: 'P2', severity: 'HIGH', locationId: 'B', requiredSpecialty: 'Trauma', status: 'PENDING', reportedAt: new Date().toISOString(), reportedAtTimestamp: 2000 },
    { id: 'E3', title: 'Cardiac Arrest', patientName: 'P3', severity: 'CRITICAL', locationId: 'C', requiredSpecialty: 'Cardiology', status: 'PENDING', reportedAt: new Date().toISOString(), reportedAtTimestamp: 3000 },
    { id: 'E4', title: 'Asthma Attack', patientName: 'P4', severity: 'MEDIUM', locationId: 'D', requiredSpecialty: 'General', status: 'PENDING', reportedAt: new Date().toISOString(), reportedAtTimestamp: 4000 },
  ];

  const result = await dsaService.prioritizeEmergencies(emergencies);
  assert.equal(result.totalCount, 4);
  assert.equal(result.highestPriority?.id, 'E3', 'Highest priority must be Critical cardiac arrest');

  const orderedIds = result.prioritized.map((e) => e.id);
  assert.deepEqual(orderedIds, ['E3', 'E2', 'E4', 'E1'], 'Must be CRITICAL -> HIGH -> MEDIUM -> LOW');
});

test('Double booking prevention: cannot assign an ambulance that is already DISPATCHED', async () => {
  await dbService.resetDatabase();
  const emergencies = await dbService.getEmergencies('PENDING');
  const availableAmbs = (await dbService.getAmbulances()).filter((a) => a.status === 'AVAILABLE');
  const hospitals = await dbService.getHospitals();

  assert.ok(availableAmbs.length > 0);
  assert.ok(emergencies.length > 0);

  const ambId = availableAmbs[0].id;
  const emgId = emergencies[0].id;
  const hospId = hospitals[0].id;

  // 1st dispatch succeeds
  await dbService.createDispatchAtomic({
    emergencyId: emgId,
    ambulanceId: ambId,
    hospitalId: hospId,
    totalTravelTimeMinutes: 15.0,
    totalDistanceKm: 8.0,
    dijkstraPath: ['LOC_WAKAD', 'LOC_HINJEWADI'],
    steps: [],
  });

  // Attempting 2nd dispatch on same ambulance must throw error
  await assert.rejects(
    async () => {
      await dbService.createDispatchAtomic({
        emergencyId: emergencies[1].id,
        ambulanceId: ambId,
        hospitalId: hospId,
        totalTravelTimeMinutes: 12.0,
        totalDistanceKm: 6.0,
        dijkstraPath: ['LOC_WAKAD', 'LOC_PIMPLE_SAUDAGAR'],
        steps: [],
      });
    },
    /Double-booking prevented/,
    'Should reject assignment when ambulance is not AVAILABLE'
  );
});
