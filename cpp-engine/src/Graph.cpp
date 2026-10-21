#include "../include/Graph.hpp"
#include <queue>
#include <stack>
#include <cmath>
#include <algorithm>
#include <iostream>

namespace RescueRoute {

void Graph::addLocation(const LocationNode& location) {
    locations_[location.id] = location;
    if (adj_.find(location.id) == adj_.end()) {
        adj_[location.id] = std::vector<Edge>();
    }
}

bool Graph::hasLocation(const std::string& locationId) const {
    return locations_.find(locationId) != locations_.end();
}

const LocationNode* Graph::getLocation(const std::string& locationId) const {
    auto it = locations_.find(locationId);
    if (it != locations_.end()) {
        return &it->second;
    }
    return nullptr;
}

const std::unordered_map<std::string, LocationNode>& Graph::getAllLocations() const {
    return locations_;
}

void Graph::addEdge(const Edge& edge, bool bidirectional) {
    // Add forward edge
    adj_[edge.source].push_back(edge);
    roadCatalog_[edge.id] = edge;

    if (bidirectional) {
        Edge reverseEdge = edge;
        reverseEdge.source = edge.target;
        reverseEdge.target = edge.source;
        // Keep same roadId or reference so blocking affects both directions
        adj_[edge.target].push_back(reverseEdge);
    }
}

bool Graph::blockRoad(const std::string& roadId) {
    auto it = roadCatalog_.find(roadId);
    if (it == roadCatalog_.end()) return false;
    it->second.isBlocked = true;

    // Update in adjacency lists
    for (auto& [locId, edges] : adj_) {
        for (auto& edge : edges) {
            if (edge.id == roadId) {
                edge.isBlocked = true;
            }
        }
    }
    return true;
}

bool Graph::unblockRoad(const std::string& roadId) {
    auto it = roadCatalog_.find(roadId);
    if (it == roadCatalog_.end()) return false;
    it->second.isBlocked = false;

    // Update in adjacency lists
    for (auto& [locId, edges] : adj_) {
        for (auto& edge : edges) {
            if (edge.id == roadId) {
                edge.isBlocked = false;
            }
        }
    }
    return true;
}

bool Graph::toggleRoadBlock(const std::string& roadId) {
    auto it = roadCatalog_.find(roadId);
    if (it == roadCatalog_.end()) return false;
    if (it->second.isBlocked) {
        return unblockRoad(roadId);
    } else {
        return blockRoad(roadId);
    }
}

bool Graph::isRoadBlocked(const std::string& roadId) const {
    auto it = roadCatalog_.find(roadId);
    if (it != roadCatalog_.end()) {
        return it->second.isBlocked;
    }
    return false;
}

const std::unordered_map<std::string, Edge>& Graph::getAllRoads() const {
    return roadCatalog_;
}

/**
 * Dijkstra's Shortest Path Algorithm using Custom Binary Min-Heap
 * Time Complexity: O((V + E) log V)
 * Space Complexity: O(V)
 */
RouteResult Graph::dijkstra(const std::string& sourceId, const std::string& destinationId) const {
    RouteResult result;
    result.sourceId = sourceId;
    result.destinationId = destinationId;
    result.hasPath = false;
    result.totalTravelTimeMinutes = 0.0;
    result.totalDistanceKm = 0.0;

    // Validation
    if (!hasLocation(sourceId)) {
        result.errorMessage = "Source location '" + sourceId + "' does not exist in road network.";
        return result;
    }
    if (!hasLocation(destinationId)) {
        result.errorMessage = "Destination location '" + destinationId + "' does not exist in road network.";
        return result;
    }

    // Trivial case: source == destination
    if (sourceId == destinationId) {
        result.hasPath = true;
        result.path = {sourceId};
        return result;
    }

    const double INF = std::numeric_limits<double>::infinity();
    std::unordered_map<std::string, double> dist;
    std::unordered_map<std::string, double> distKm;
    struct Predecessor {
        std::string prevNode;
        Edge edge;
    };
    std::unordered_map<std::string, Predecessor> prev;

    for (const auto& [locId, _] : locations_) {
        dist[locId] = INF;
        distKm[locId] = 0.0;
    }
    dist[sourceId] = 0.0;

    // Custom MinHeap for node exploration
    MinHeap<std::string, double> minHeap;
    minHeap.insert(sourceId, sourceId, 0.0);

    std::unordered_set<std::string> visited;

    while (!minHeap.isEmpty()) {
        auto topNode = minHeap.extractMin();
        std::string u = topNode.data;
        double currentDist = topNode.key;

        if (visited.find(u) != visited.end()) continue;
        visited.insert(u);

        // Early exit if we reached target
        if (u == destinationId) {
            break;
        }

        auto adjIt = adj_.find(u);
        if (adjIt == adj_.end()) continue;

        for (const auto& edge : adjIt->second) {
            // Skip blocked road
            if (edge.isBlocked) {
                continue;
            }

            const std::string& v = edge.target;
            if (visited.find(v) != visited.end()) {
                continue;
            }

            double weight = edge.travelTimeMinutes;
            double newDist = currentDist + weight;

            if (newDist < dist[v]) {
                dist[v] = newDist;
                distKm[v] = distKm[u] + edge.distanceKm;
                prev[v] = Predecessor{u, edge};

                if (minHeap.contains(v)) {
                    minHeap.decreaseKey(v, newDist);
                } else {
                    minHeap.insert(v, v, newDist);
                }
            }
        }
    }

    if (dist[destinationId] == INF) {
        result.errorMessage = "No navigable route exists between '" + sourceId + "' and '" + destinationId + "'. Road closures may have isolated the destination.";
        return result;
    }

    // Reconstruct path
    result.hasPath = true;
    result.totalTravelTimeMinutes = dist[destinationId];
    result.totalDistanceKm = distKm[destinationId];

    std::vector<std::string> reversedPath;
    std::vector<RouteStep> reversedSteps;
    std::string curr = destinationId;

    while (curr != sourceId) {
        reversedPath.push_back(curr);
        auto prevIt = prev.find(curr);
        if (prevIt == prev.end()) break;

        const auto& pred = prevIt->second;
        RouteStep step;
        step.fromId = pred.prevNode;
        step.toId = curr;
        step.roadId = pred.edge.id;
        step.roadName = pred.edge.roadName;
        step.travelTimeMinutes = pred.edge.travelTimeMinutes;
        step.distanceKm = pred.edge.distanceKm;
        reversedSteps.push_back(step);

        curr = pred.prevNode;
    }
    reversedPath.push_back(sourceId);

    // Reverse to get source -> destination order
    std::reverse(reversedPath.begin(), reversedPath.end());
    std::reverse(reversedSteps.begin(), reversedSteps.end());

    result.path = std::move(reversedPath);
    result.steps = std::move(reversedSteps);

    return result;
}

/**
 * Breadth-First Search (BFS) Traversal
 * Explores graph level by level, ideal for visualizing network reachability.
 */
TraversalResult Graph::traverseBFS(const std::string& startNodeId) const {
    TraversalResult result;
    result.algorithm = "BFS";
    result.startNodeId = startNodeId;

    if (!hasLocation(startNodeId)) {
        return result;
    }

    std::unordered_set<std::string> visited;
    std::queue<std::pair<std::string, int>> q; // (nodeId, depth)

    visited.insert(startNodeId);
    q.push({startNodeId, 0});

    result.visitOrder.push_back(startNodeId);
    result.visitSteps.push_back({
        {"nodeId", startNodeId},
        {"depth", 0},
        {"parent", nullptr}
    });

    while (!q.empty()) {
        auto [u, depth] = q.front();
        q.pop();

        auto adjIt = adj_.find(u);
        if (adjIt == adj_.end()) continue;

        for (const auto& edge : adjIt->second) {
            if (edge.isBlocked) continue; // Respect road blocks

            const std::string& v = edge.target;
            if (visited.find(v) == visited.end()) {
                visited.insert(v);
                result.visitOrder.push_back(v);
                result.visitSteps.push_back({
                    {"nodeId", v},
                    {"depth", depth + 1},
                    {"parent", u},
                    {"roadId", edge.id},
                    {"roadName", edge.roadName}
                });
                q.push({v, depth + 1});
            }
        }
    }

    return result;
}

/**
 * Depth-First Search (DFS) Traversal
 * Explores deep branches before backtracking.
 */
TraversalResult Graph::traverseDFS(const std::string& startNodeId) const {
    TraversalResult result;
    result.algorithm = "DFS";
    result.startNodeId = startNodeId;

    if (!hasLocation(startNodeId)) {
        return result;
    }

    std::unordered_set<std::string> visited;

    std::function<void(const std::string&, int, const std::string&)> dfsVisit =
        [&](const std::string& u, int depth, const std::string& parent) {
            visited.insert(u);
            result.visitOrder.push_back(u);

            json step = {
                {"nodeId", u},
                {"depth", depth},
                {"parent", parent.empty() ? nullptr : json(parent)}
            };
            result.visitSteps.push_back(step);

            auto adjIt = adj_.find(u);
            if (adjIt == adj_.end()) return;

            for (const auto& edge : adjIt->second) {
                if (edge.isBlocked) continue;
                const std::string& v = edge.target;
                if (visited.find(v) == visited.end()) {
                    dfsVisit(v, depth + 1, u);
                }
            }
        };

    dfsVisit(startNodeId, 0, "");
    return result;
}

/**
 * Rank Available Ambulances by ETA using Dijkstra Shortest Paths
 */
std::vector<AmbulanceCandidate> Graph::rankAmbulances(
    const std::string& emergencyLocationId,
    const std::vector<AmbulanceCandidate>& candidates
) const {
    std::vector<AmbulanceCandidate> ranked = candidates;

    for (auto& amb : ranked) {
        if (amb.status != "AVAILABLE" && amb.status != "available") {
            amb.etaMinutes = std::numeric_limits<double>::infinity();
            continue;
        }

        RouteResult route = dijkstra(amb.currentLocationId, emergencyLocationId);
        amb.routeToEmergency = route;
        if (route.hasPath) {
            amb.etaMinutes = route.totalTravelTimeMinutes;
        } else {
            amb.etaMinutes = std::numeric_limits<double>::infinity();
        }
    }

    // Sort by ETA ascending; tie-break by ID
    std::sort(ranked.begin(), ranked.end(), [](const AmbulanceCandidate& a, const AmbulanceCandidate& b) {
        if (std::abs(a.etaMinutes - b.etaMinutes) > 0.001) {
            return a.etaMinutes < b.etaMinutes;
        }
        return a.id < b.id;
    });

    return ranked;
}

/**
 * Rank Hospitals by Route Travel Time, Specialty Capability, and Bed Availability
 */
std::vector<HospitalCandidate> Graph::rankHospitals(
    const std::string& emergencyLocationId,
    const std::string& requiredSpecialty,
    const std::vector<HospitalCandidate>& candidates
) const {
    std::vector<HospitalCandidate> ranked = candidates;

    for (auto& hosp : ranked) {
        // Check specialty
        bool match = false;
        if (requiredSpecialty.empty() || requiredSpecialty == "General" || requiredSpecialty == "GENERAL") {
            match = true;
        } else {
            for (const auto& sp : hosp.specialties) {
                if (sp == requiredSpecialty || sp == "Multispecialty" || sp == "Emergency Care") {
                    match = true;
                    break;
                }
            }
        }
        hosp.hasRequiredSpecialty = match;

        RouteResult route = dijkstra(emergencyLocationId, hosp.locationId);
        hosp.routeFromEmergency = route;

        if (route.hasPath) {
            hosp.travelTimeMinutes = route.totalTravelTimeMinutes;

            // Composite scoring function (Lower is better):
            // 1. Travel time base penalty
            // 2. Specialty mismatch penalty (+15 mins equivalent)
            // 3. Full capacity penalty (+30 mins equivalent if 0 beds)
            // 4. Capacity bonus (slight preference for higher available beds)
            double score = hosp.travelTimeMinutes;
            if (!match) score += 15.0;
            if (hosp.availableBeds <= 0) score += 30.0;
            else score -= std::min(5.0, hosp.availableBeds * 0.1);

            hosp.compositeScore = score;
        } else {
            hosp.travelTimeMinutes = std::numeric_limits<double>::infinity();
            hosp.compositeScore = std::numeric_limits<double>::infinity();
        }
    }

    std::sort(ranked.begin(), ranked.end(), [](const HospitalCandidate& a, const HospitalCandidate& b) {
        if (std::abs(a.compositeScore - b.compositeScore) > 0.001) {
            return a.compositeScore < b.compositeScore;
        }
        return a.travelTimeMinutes < b.travelTimeMinutes;
    });

    return ranked;
}

void Graph::clear() {
    locations_.clear();
    adj_.clear();
    roadCatalog_.clear();
}

} // namespace RescueRoute
