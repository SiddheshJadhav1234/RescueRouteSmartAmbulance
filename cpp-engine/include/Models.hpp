#pragma once

#include <string>
#include <vector>
#include "json.hpp"

namespace RescueRoute {

using json = nlohmann::json;

struct Edge {
    std::string id;
    std::string source;
    std::string target;
    double travelTimeMinutes; // edge weight
    double distanceKm;
    bool isBlocked;
    std::string roadName;

    json toJson() const {
        return json{
            {"id", id},
            {"source", source},
            {"target", target},
            {"travelTimeMinutes", travelTimeMinutes},
            {"distanceKm", distanceKm},
            {"isBlocked", isBlocked},
            {"roadName", roadName}
        };
    }
};

struct LocationNode {
    std::string id;
    std::string name;
    std::string zone;
    double lat;
    double lng;

    json toJson() const {
        return json{
            {"id", id},
            {"name", name},
            {"zone", zone},
            {"lat", lat},
            {"lng", lng}
        };
    }
};

enum class EmergencySeverity {
    CRITICAL = 1, // Highest priority
    HIGH = 2,
    MEDIUM = 3,
    LOW = 4       // Lowest priority
};

inline std::string severityToString(EmergencySeverity s) {
    switch (s) {
        case EmergencySeverity::CRITICAL: return "CRITICAL";
        case EmergencySeverity::HIGH: return "HIGH";
        case EmergencySeverity::MEDIUM: return "MEDIUM";
        case EmergencySeverity::LOW: return "LOW";
        default: return "MEDIUM";
    }
}

inline EmergencySeverity stringToSeverity(const std::string& str) {
    if (str == "CRITICAL" || str == "critical" || str == "1") return EmergencySeverity::CRITICAL;
    if (str == "HIGH" || str == "high" || str == "2") return EmergencySeverity::HIGH;
    if (str == "MEDIUM" || str == "medium" || str == "3") return EmergencySeverity::MEDIUM;
    if (str == "LOW" || str == "low" || str == "4") return EmergencySeverity::LOW;
    return EmergencySeverity::MEDIUM;
}

struct EmergencyItem {
    std::string id;
    std::string title;
    std::string patientName;
    EmergencySeverity severity;
    std::string locationId;
    std::string requiredSpecialty;
    std::string status; // PENDING, ASSIGNED, DISPATCHED, COMPLETED, CANCELLED
    int64_t reportedAtTimestamp; // epoch timestamp in ms

    // Custom comparator for min-heap priority:
    // 1. Lower severity numeric value = higher priority (CRITICAL=1 comes before LOW=4)
    // 2. Tie-break: earlier reportedAtTimestamp has higher priority
    bool hasHigherPriorityThan(const EmergencyItem& other) const {
        int s1 = static_cast<int>(severity);
        int s2 = static_cast<int>(other.severity);
        if (s1 != s2) {
            return s1 < s2;
        }
        return reportedAtTimestamp < other.reportedAtTimestamp;
    }

    json toJson() const {
        return json{
            {"id", id},
            {"title", title},
            {"patientName", patientName},
            {"severity", severityToString(severity)},
            {"severityRank", static_cast<int>(severity)},
            {"locationId", locationId},
            {"requiredSpecialty", requiredSpecialty},
            {"status", status},
            {"reportedAtTimestamp", reportedAtTimestamp}
        };
    }
};

struct RouteStep {
    std::string fromId;
    std::string toId;
    std::string roadId;
    std::string roadName;
    double travelTimeMinutes;
    double distanceKm;

    json toJson() const {
        return json{
            {"fromId", fromId},
            {"toId", toId},
            {"roadId", roadId},
            {"roadName", roadName},
            {"travelTimeMinutes", travelTimeMinutes},
            {"distanceKm", distanceKm}
        };
    }
};

struct RouteResult {
    bool hasPath;
    std::string sourceId;
    std::string destinationId;
    double totalTravelTimeMinutes;
    double totalDistanceKm;
    std::vector<std::string> path; // list of node IDs
    std::vector<RouteStep> steps;
    std::string errorMessage;

    json toJson() const {
        json stepsJson = json::array();
        for (const auto& step : steps) {
            stepsJson.push_back(step.toJson());
        }
        return json{
            {"hasPath", hasPath},
            {"sourceId", sourceId},
            {"destinationId", destinationId},
            {"totalTravelTimeMinutes", totalTravelTimeMinutes},
            {"totalDistanceKm", totalDistanceKm},
            {"path", path},
            {"steps", stepsJson},
            {"errorMessage", errorMessage}
        };
    }
};

struct TraversalResult {
    std::string algorithm; // "BFS" or "DFS"
    std::string startNodeId;
    std::vector<std::string> visitOrder;
    std::vector<json> visitSteps; // node, depth/level, parent

    json toJson() const {
        return json{
            {"algorithm", algorithm},
            {"startNodeId", startNodeId},
            {"visitOrder", visitOrder},
            {"visitSteps", visitSteps}
        };
    }
};

struct AmbulanceCandidate {
    std::string id;
    std::string vehicleNumber;
    std::string type; // ALS (Advanced Life Support), BLS (Basic Life Support), PATIENT_TRANSPORT
    std::string currentLocationId;
    std::string status; // AVAILABLE, DISPATCHED, MAINTENANCE
    double etaMinutes;
    RouteResult routeToEmergency;

    json toJson() const {
        return json{
            {"id", id},
            {"vehicleNumber", vehicleNumber},
            {"type", type},
            {"currentLocationId", currentLocationId},
            {"status", status},
            {"etaMinutes", etaMinutes},
            {"route", routeToEmergency.toJson()}
        };
    }
};

struct HospitalCandidate {
    std::string id;
    std::string name;
    std::string locationId;
    int availableBeds;
    int totalBeds;
    std::vector<std::string> specialties;
    bool hasRequiredSpecialty;
    double travelTimeMinutes;
    RouteResult routeFromEmergency;
    double compositeScore; // DSA ranking score based on ETA, specialty match, bed availability

    json toJson() const {
        return json{
            {"id", id},
            {"name", name},
            {"locationId", locationId},
            {"availableBeds", availableBeds},
            {"totalBeds", totalBeds},
            {"specialties", specialties},
            {"hasRequiredSpecialty", hasRequiredSpecialty},
            {"travelTimeMinutes", travelTimeMinutes},
            {"compositeScore", compositeScore},
            {"route", routeFromEmergency.toJson()}
        };
    }
};

} // namespace RescueRoute
