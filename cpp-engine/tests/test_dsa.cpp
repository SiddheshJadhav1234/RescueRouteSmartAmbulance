#include "../include/Graph.hpp"
#include "../include/MinHeap.hpp"
#include "../include/EmergencyQueue.hpp"
#include <iostream>
#include <cassert>
#include <cmath>

using namespace RescueRoute;

void testCustomMinHeap() {
    std::cout << "[TEST] Running Custom Min-Heap unit tests..." << std::endl;
    MinHeap<std::string, double> heap;

    assert(heap.isEmpty());
    assert(heap.size() == 0);

    heap.insert("A", "Node-A", 15.0);
    heap.insert("B", "Node-B", 5.0);
    heap.insert("C", "Node-C", 20.0);
    heap.insert("D", "Node-D", 1.0);

    assert(!heap.isEmpty());
    assert(heap.size() == 4);
    assert(heap.peekMin().id == "D");
    assert(heap.peekMin().key == 1.0);

    // Extract minimums in ascending key order: D (1.0), B (5.0), A (15.0), C (20.0)
    auto n1 = heap.extractMin();
    assert(n1.id == "D" && n1.key == 1.0);

    // Test decreaseKey: decrease A from 15.0 to 2.0 -> should become new min
    bool decreased = heap.decreaseKey("A", 2.0);
    assert(decreased);
    assert(heap.peekMin().id == "A" && heap.peekMin().key == 2.0);

    auto n2 = heap.extractMin();
    assert(n2.id == "A" && n2.key == 2.0);

    auto n3 = heap.extractMin();
    assert(n3.id == "B" && n3.key == 5.0);

    // Test remove
    assert(heap.size() == 1);
    heap.insert("E", "Node-E", 35.0);
    bool removed = heap.remove("C");
    assert(removed);
    assert(heap.size() == 1);
    assert(heap.peekMin().id == "E");

    std::cout << "  ✓ Custom Min-Heap passed all assertions." << std::endl;
}

void testEmergencyPriorityQueue() {
    std::cout << "[TEST] Running Emergency Priority Queue tests..." << std::endl;
    EmergencyQueue eq;

    assert(eq.isEmpty());

    // 1. Critical vs High vs Medium vs Low
    // Critical (Severity 1), High (Severity 2), Medium (Severity 3), Low (Severity 4)
    EmergencyItem eLow{"E-LOW", "Sprained Ankle", "Rohan", EmergencySeverity::LOW, "LOC_A", "General", "PENDING", 1000};
    EmergencyItem eMed{"E-MED", "High Fever", "Pooja", EmergencySeverity::MEDIUM, "LOC_B", "General", "PENDING", 2000};
    EmergencyItem eHigh{"E-HIGH", "Deep Laceration", "Amit", EmergencySeverity::HIGH, "LOC_C", "Trauma", "PENDING", 3000};
    EmergencyItem eCrit{"E-CRIT", "Cardiac Arrest", "Suresh", EmergencySeverity::CRITICAL, "LOC_D", "Cardiology", "PENDING", 4000};

    // Insert out of order
    eq.enqueue(eLow);
    eq.enqueue(eMed);
    eq.enqueue(eHigh);
    eq.enqueue(eCrit);

    assert(eq.size() == 4);

    // Highest priority MUST be Critical, even though reported latest
    auto first = eq.dequeue();
    assert(first.has_value());
    assert(first->id == "E-CRIT");

    auto second = eq.dequeue();
    assert(second.has_value());
    assert(second->id == "E-HIGH");

    auto third = eq.dequeue();
    assert(third.has_value());
    assert(third->id == "E-MED");

    auto fourth = eq.dequeue();
    assert(fourth.has_value());
    assert(fourth->id == "E-LOW");

    // 2. Equal priority tie-break: earlier reported timestamp first
    EmergencyItem c1{"C1", "Cardiac 1", "P1", EmergencySeverity::CRITICAL, "LOC_A", "Cardiology", "PENDING", 1000};
    EmergencyItem c2{"C2", "Cardiac 2", "P2", EmergencySeverity::CRITICAL, "LOC_B", "Cardiology", "PENDING", 500}; // Earlier!

    eq.enqueue(c1);
    eq.enqueue(c2);

    auto t1 = eq.dequeue();
    assert(t1.has_value() && t1->id == "C2"); // 500ms before 1000ms

    auto t2 = eq.dequeue();
    assert(t2.has_value() && t2->id == "C1");

    // 3. Stale prevention test: remove and update
    EmergencyItem m1{"M1", "Broken Arm", "P3", EmergencySeverity::MEDIUM, "LOC_C", "Orthopedics", "PENDING", 1200};
    eq.enqueue(m1);
    assert(eq.contains("M1"));

    // Update severity to CRITICAL
    m1.severity = EmergencySeverity::CRITICAL;
    eq.update(m1);
    assert(eq.peek()->severity == EmergencySeverity::CRITICAL);

    // Remove from queue
    bool rem = eq.remove("M1");
    assert(rem);
    assert(eq.isEmpty());

    std::cout << "  ✓ Emergency Priority Queue passed all assertions." << std::endl;
}

void testGraphAlgorithms() {
    std::cout << "[TEST] Running Graph, Dijkstra, BFS, DFS, and Obstruction tests..." << std::endl;
    Graph g;

    // Fictional Pune network
    g.addLocation({"HINJEWADI", "Hinjewadi IT Park", "West", 18.5913, 73.7389});
    g.addLocation({"WAKAD", "Wakad Junction", "West", 18.5987, 73.7667});
    g.addLocation({"BANER", "Baner Road", "West", 18.5590, 73.7868});
    g.addLocation({"AUNDH", "Aundh Medical Hub", "Central-West", 18.5580, 73.8070});
    g.addLocation({"SHIVAJINAGAR", "Shivajinagar Station", "Central", 18.5314, 73.8446});
    g.addLocation({"ISOLATED", "Isolated Island Node", "Remote", 18.5000, 73.7000});

    // Roads (bidirectional)
    g.addEdge({"R1", "HINJEWADI", "WAKAD", 8.0, 5.0, false, "Hinjewadi-Wakad Flyover"});
    g.addEdge({"R2", "WAKAD", "BANER", 10.0, 6.0, false, "NH-48 Bypass"});
    g.addEdge({"R3", "BANER", "AUNDH", 7.0, 4.0, false, "Baner Road"});
    g.addEdge({"R4", "AUNDH", "SHIVAJINAGAR", 12.0, 7.5, false, "Ganeshkhind Road"});

    // Direct alternate highway from Wakad to Aundh (faster than Wakad -> Baner -> Aundh: 12 min vs 10+7 = 17 min)
    g.addEdge({"R5", "WAKAD", "AUNDH", 12.0, 7.0, false, "Pashan-Sus Link Road"});

    // 1. Direct shortest path
    RouteResult rDirect = g.dijkstra("HINJEWADI", "WAKAD");
    assert(rDirect.hasPath);
    assert(rDirect.totalTravelTimeMinutes == 8.0);
    assert(rDirect.path.size() == 2);
    assert(rDirect.path[0] == "HINJEWADI" && rDirect.path[1] == "WAKAD");

    // 2. Multi-edge shortest path: Hinjewadi to Aundh
    // Path options:
    //  Hinjewadi -> Wakad (8) + Wakad -> Aundh (12) = 20 min
    //  Hinjewadi -> Wakad (8) + Wakad -> Baner (10) + Baner -> Aundh (7) = 25 min
    RouteResult rMulti = g.dijkstra("HINJEWADI", "AUNDH");
    assert(rMulti.hasPath);
    assert(rMulti.totalTravelTimeMinutes == 20.0);
    assert(rMulti.path.size() == 3);
    assert(rMulti.path[0] == "HINJEWADI");
    assert(rMulti.path[1] == "WAKAD");
    assert(rMulti.path[2] == "AUNDH");

    // 3. Blocked road causing alternate route:
    // Block R5 (Wakad - Aundh). Now best route should switch to Hinjewadi -> Wakad -> Baner -> Aundh (25 min)
    g.blockRoad("R5");
    assert(g.isRoadBlocked("R5"));
    RouteResult rDetour = g.dijkstra("HINJEWADI", "AUNDH");
    assert(rDetour.hasPath);
    assert(rDetour.totalTravelTimeMinutes == 25.0);
    assert(rDetour.path.size() == 4);
    assert(rDetour.path[0] == "HINJEWADI");
    assert(rDetour.path[1] == "WAKAD");
    assert(rDetour.path[2] == "BANER");
    assert(rDetour.path[3] == "AUNDH");

    // Unblock R5 and verify it restores faster path
    g.unblockRoad("R5");
    assert(!g.isRoadBlocked("R5"));
    RouteResult rRestored = g.dijkstra("HINJEWADI", "AUNDH");
    assert(rRestored.totalTravelTimeMinutes == 20.0);

    // 4. No available route (disconnected destination)
    RouteResult rIsolated = g.dijkstra("HINJEWADI", "ISOLATED");
    assert(!rIsolated.hasPath);
    assert(!rIsolated.errorMessage.empty());

    // 5. Unknown location validation
    RouteResult rUnknown = g.dijkstra("NON_EXISTENT", "WAKAD");
    assert(!rUnknown.hasPath);

    // 6. BFS Traversal
    TraversalResult bfs = g.traverseBFS("HINJEWADI");
    assert(bfs.algorithm == "BFS");
    assert(bfs.visitOrder.size() >= 5);
    assert(bfs.visitOrder[0] == "HINJEWADI");

    // 7. DFS Traversal
    TraversalResult dfs = g.traverseDFS("HINJEWADI");
    assert(dfs.algorithm == "DFS");
    assert(dfs.visitOrder[0] == "HINJEWADI");

    std::cout << "  ✓ Graph algorithms & Dijkstra passed all assertions." << std::endl;
}

int main() {
    std::cout << "=========================================" << std::endl;
    std::cout << "  RescueRoute C++ DSA Engine Test Suite   " << std::endl;
    std::cout << "=========================================" << std::endl;

    testCustomMinHeap();
    testEmergencyPriorityQueue();
    testGraphAlgorithms();

    std::cout << "=========================================" << std::endl;
    std::cout << "  ALL DSA UNIT TESTS PASSED SUCCESSFULLY! " << std::endl;
    std::cout << "=========================================" << std::endl;
    return 0;
}
