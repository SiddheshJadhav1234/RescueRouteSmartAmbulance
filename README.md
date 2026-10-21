# RescueRoute — Smart Emergency Response & Ambulance Dispatch System
### Using Graph Algorithms and Priority Queues (C++17 + Node.js + React + Supabase)

**RescueRoute** is a comprehensive full-stack college DSA project that models and simulates real-world emergency medical dispatching across a metropolitan road network (inspired by Pune, India). It features a standalone custom **C++17 Data Structures and Algorithms (DSA) Engine**, an **Express Node.js REST API**, and a **React 19 + TypeScript** dashboard with interactive Leaflet and SVG mapping.

---

## 1. System Architecture

```
+-----------------------------------------------------------------------------------+
|                            FRONTEND (React 19 + TypeScript)                       |
|  - Operations Dashboard    - Priority Queue View        - Turn-by-Turn Path HUD   |
|  - Leaflet Map (Pune OSM)  - BFS / DFS Visualizer       - Recharts Analytics      |
+------------------------------------------+----------------------------------------+
                                           | HTTP REST (/api/*)
                                           v
+-----------------------------------------------------------------------------------+
|                              BACKEND (Node.js + Express)                          |
|  - Express REST Routes                   - Input Validation (Zod)                 |
|  - Concurrency Lock & Double-Booking Guard - Supabase PostgreSQL Database Client  |
+------------------------------------------+----------------------------------------+
                                           | Non-blocking child_process.spawn
                                           | stdin (JSON) -> stdout (JSON)
                                           v
+-----------------------------------------------------------------------------------+
|                          C++17 DSA ENGINE (Native Binary)                         |
|  - Adjacency List Weighted Graph         - Custom Indexed Binary Min-Heap         |
|  - Dijkstra's Shortest Path Algorithm    - Priority Queue (Severity + FIFO Time)  |
|  - Breadth-First Search (BFS)            - Depth-First Search (DFS)               |
|  - Dynamic Obstruction & Detour Handler  - Fleet & Hospital Composite Ranking     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Data Structures & Algorithms

| Component | Concrete Implementation | Time Complexity | Space Complexity | Engineering Rationale |
|---|---|---|---|---|
| **Road Network** | Custom Adjacency List (`std::unordered_map<string, vector<Edge>>`) | **O(V + E)** storage, **O(degree(u))** neighbor lookup | **O(V + E)** | Road graphs are sparse planar networks ($E \approx 2V$ to $3V$). An adjacency matrix would waste $O(V^2)$ memory on empty cells. |
| **Shortest Path** | Dijkstra's Algorithm with Custom Min-Heap | **O((V + E) log V)** | **O(V)** | Evaluates true physical impedance (travel time in minutes) while guaranteeing optimal routes. Outperforms $O(V^2)$ dense matrix approaches. |
| **Min-Heap** | Custom Array-Based Binary Min-Heap with `posMap_` | **O(log N)** insert/extract, **O(1)** peek, **O(log N)** decreaseKey | **O(N)** | Standard `std::priority_queue` does not support `decreaseKey()` or in-place item removal, causing stale queue entries. Our indexed heap guarantees no stale records. |
| **Emergency Triage** | Custom Priority Queue (`MinHeap<EmergencyItem, pair<int, int64_t>>`) | **O(log N)** enqueue / dequeue | **O(N)** | Lexicographical composite key: 1 = CRITICAL, 2 = HIGH, 3 = MEDIUM, 4 = LOW; tie-breaking uses epoch timestamp (FIFO). |
| **Reachability** | Breadth-First Search (BFS) | **O(V + E)** | **O(V)** | Explores network radius level-by-level to compute zone reachability and perimeter coverage. |
| **Cycle & Connectivity** | Depth-First Search (DFS) | **O(V + E)** | **O(V)** | Explores depth branches to detect alternative escape corridors and network partition components. |
| **Fast Lookup** | Hash Map (`std::unordered_map`) | **O(1)** average | **O(V)** | Instant translation between UUIDs, coordinates, and vertex adjacency vectors. |

---

## 3. Database Schema (PostgreSQL / Supabase)

- **`locations`**: Graph vertices representing Pune metropolitan hubs (`id`, `name`, `zone`, `latitude`, `longitude`, `landmark`).
- **`roads`**: Graph weighted edges (`id`, `source_location_id`, `target_location_id`, `distance_km`, `base_travel_time_minutes`, `is_blocked`, `block_reason`).
- **`ambulances`**: Fleet vehicles (`id`, `vehicle_number`, `type: ALS/BLS`, `status: AVAILABLE/DISPATCHED/MAINTENANCE`, `current_location_id`, `driver_name`, `equipment_level`).
- **`hospitals`**: Healthcare facilities (`id`, `name`, `location_id`, `total_beds`, `available_beds`, `icu_available`, `specialties[]`, `contact_emergency`).
- **`emergencies`**: Patient calls (`id`, `title`, `patient_name`, `severity: CRITICAL/HIGH/MEDIUM/LOW`, `location_id`, `required_specialty`, `status: PENDING/ASSIGNED/IN_TRANSIT/COMPLETED`).
- **`dispatches`**: Mission execution records (`id`, `emergency_id`, `ambulance_id`, `hospital_id`, `total_travel_time_minutes`, `dijkstra_path[]`, `steps[]`, `status`).

---

## 4. End-to-End Emergency Dispatch Workflow

1. **Emergency Intake**: An operator registers a call (e.g. *Suspected Acute Myocardial Infarction* at *Hinjewadi Phase 1* with *CRITICAL* severity).
2. **Priority Enqueue**: The backend streams the incident to the C++ Emergency Queue. Because CRITICAL = Rank 1, it immediately floats to root index 0 of the Min-Heap.
3. **Ambulance Ranking**: The C++ engine computes Dijkstra shortest paths from every `AVAILABLE` ambulance base to Hinjewadi.
4. **Hospital Ranking**: The engine evaluates candidate hospitals using a composite score based on Dijkstra travel time, bed availability, and specialty capability (Cardiology match).
5. **Concurrency-Safe Dispatch**: The backend executes an atomic transition:
   `UPDATE ambulances SET status = 'DISPATCHED' WHERE id = :id AND status = 'AVAILABLE'`.
   If the ambulance was double-booked by another operator, the transaction throws an immediate conflict error.
6. **Dynamic Obstruction Simulation**: If a corridor (e.g., Hinjewadi-Wakad Bridge) is blocked due to traffic or a tree fall, the operator clicks "Block Road". Dijkstra automatically re-evaluates the graph and routes via the Balewadi bypass!
7. **Mission Completion**: Upon reaching the hospital, clicking "Complete Mission" discharges the patient and restores the ambulance to `AVAILABLE` status.

---

## 5. Build and Installation Instructions

### Prerequisites
- Node.js (v18+) & npm
- C++17 compiler (`g++` or `clang++`)
- CMake (v3.16+)

### 1. Compile C++ DSA Engine
```bash
cd cpp-engine
mkdir -p build && cd build
cmake ..
make -j4
./test_dsa       # Runs comprehensive DSA test suite
cd ../..
```

### 2. Install Node.js Dependencies & Run Full-Stack Server
```bash
npm install
npm run dev      # Starts full-stack Express server on http://localhost:3000 with Vite middleware
```

### 3. Run Automated Tests
```bash
# Run C++ Unit Tests
./cpp-engine/build/test_dsa

# Run Node.js API & Integration Tests
npx tsx --test backend/tests/dsa_integration.test.ts
```

---

## 6. College Viva Questions & Answers

**Q1: Why did you write your own Min-Heap instead of using `std::priority_queue`?**
*Answer:* `std::priority_queue` lacks `decreaseKey()` and `remove(id)`. When an edge weight is relaxed in Dijkstra, `std::priority_queue` forces pushing duplicates, increasing heap size to $O(E)$. In emergency queues, if an incident is escalated or cancelled, stale entries cannot be removed. Our custom Min-Heap tracks indices with `posMap_`, achieving $O(\log V)$ decrease-key and in-place deletion.

**Q2: Can Dijkstra handle negative weights? Why is travel time non-negative?**
*Answer:* Dijkstra assumes that adding an edge to a path cannot decrease its total cost (greedy choice property). In real emergency dispatch, travel times are elapsed physical minutes and are strictly positive ($\geq 0$). Negative cycles do not exist in physical transit.

**Q3: How does your Node.js backend invoke C++?**
*Answer:* Using non-blocking `child_process.spawn` passing arguments as structured arrays to avoid shell injection. Input JSON is piped via `stdin` and output JSON is parsed from `stdout`, with an 8-second execution watchdog.
