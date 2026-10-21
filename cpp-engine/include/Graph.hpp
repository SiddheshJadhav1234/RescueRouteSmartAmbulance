#pragma once

#include "Models.hpp"
#include "MinHeap.hpp"
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <stack>
#include <algorithm>
#include <limits>

namespace RescueRoute {

class Graph {
private:
    std::unordered_map<std::string, LocationNode> locations_;
    std::unordered_map<std::string, std::vector<Edge>> adj_; // locationId -> outgoing edges
    std::unordered_map<std::string, Edge> roadCatalog_;     // roadId -> Edge metadata

public:
    Graph() = default;

    void addLocation(const LocationNode& location);
    bool hasLocation(const std::string& locationId) const;
    const LocationNode* getLocation(const std::string& locationId) const;
    const std::unordered_map<std::string, LocationNode>& getAllLocations() const;

    void addEdge(const Edge& edge, bool bidirectional = true);
    bool blockRoad(const std::string& roadId);
    bool unblockRoad(const std::string& roadId);
    bool toggleRoadBlock(const std::string& roadId);
    bool isRoadBlocked(const std::string& roadId) const;
    const std::unordered_map<std::string, Edge>& getAllRoads() const;

    // Core Algorithms
    RouteResult dijkstra(const std::string& sourceId, const std::string& destinationId) const;
    TraversalResult traverseBFS(const std::string& startNodeId) const;
    TraversalResult traverseDFS(const std::string& startNodeId) const;

    // Lookup and Ranking
    std::vector<AmbulanceCandidate> rankAmbulances(
        const std::string& emergencyLocationId,
        const std::vector<AmbulanceCandidate>& candidates
    ) const;

    std::vector<HospitalCandidate> rankHospitals(
        const std::string& emergencyLocationId,
        const std::string& requiredSpecialty,
        const std::vector<HospitalCandidate>& candidates
    ) const;

    void clear();
};

} // namespace RescueRoute
