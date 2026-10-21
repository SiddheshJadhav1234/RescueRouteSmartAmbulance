#include "../include/Graph.hpp"
#include "../include/EmergencyQueue.hpp"
#include "../include/Models.hpp"
#include "../include/json.hpp"
#include <iostream>
#include <string>
#include <chrono>

using json = nlohmann::json;
using namespace RescueRoute;

// Helper to populate Graph from JSON arrays
static Graph buildGraphFromJson(const json& req) {
    Graph g;
    if (req.contains("locations") && req["locations"].is_array()) {
        for (const auto& l : req["locations"]) {
            LocationNode loc;
            loc.id = l.value("id", "");
            loc.name = l.value("name", "");
            loc.zone = l.value("zone", "");
            loc.lat = l.value("lat", 0.0);
            loc.lng = l.value("lng", 0.0);
            g.addLocation(loc);
        }
    }

    if (req.contains("roads") && req["roads"].is_array()) {
        for (const auto& r : req["roads"]) {
            Edge edge;
            edge.id = r.value("id", "");
            edge.source = r.value("source", "");
            edge.target = r.value("target", "");
            edge.travelTimeMinutes = r.value("travelTimeMinutes", 0.0);
            edge.distanceKm = r.value("distanceKm", 0.0);
            edge.isBlocked = r.value("isBlocked", false);
            edge.roadName = r.value("roadName", "");
            bool bidirectional = r.value("bidirectional", true);
            g.addEdge(edge, bidirectional);
        }
    }
    return g;
}

int main() {
    // Read complete JSON payload from standard input
    std::string inputStr;
    try {
        std::string line;
        while (std::getline(std::cin, line)) {
            inputStr += line + "\n";
        }

        if (inputStr.empty()) {
            json err = {
                {"success", false},
                {"error", "Empty input stream received on stdin."}
            };
            std::cout << err.dump() << std::endl;
            return 0;
        }

        json req = json::parse(inputStr);
        std::string op = req.value("operation", "");

        json response;
        response["success"] = true;
        response["operation"] = op;

        auto startTime = std::chrono::high_resolution_clock::now();

        if (op == "calculate_route") {
            Graph g = buildGraphFromJson(req);
            std::string sourceId = req.value("sourceId", "");
            std::string destinationId = req.value("destinationId", "");

            RouteResult route = g.dijkstra(sourceId, destinationId);
            response["result"] = route.toJson();

        } else if (op == "traverse_bfs") {
            Graph g = buildGraphFromJson(req);
            std::string startNodeId = req.value("startNodeId", "");
            TraversalResult tr = g.traverseBFS(startNodeId);
            response["result"] = tr.toJson();

        } else if (op == "traverse_dfs") {
            Graph g = buildGraphFromJson(req);
            std::string startNodeId = req.value("startNodeId", "");
            TraversalResult tr = g.traverseDFS(startNodeId);
            response["result"] = tr.toJson();

        } else if (op == "prioritize_emergencies") {
            EmergencyQueue eq;
            if (req.contains("emergencies") && req["emergencies"].is_array()) {
                for (const auto& e : req["emergencies"]) {
                    EmergencyItem item;
                    item.id = e.value("id", "");
                    item.title = e.value("title", "");
                    item.patientName = e.value("patientName", "");
                    item.severity = stringToSeverity(e.value("severity", "MEDIUM"));
                    item.locationId = e.value("locationId", "");
                    item.requiredSpecialty = e.value("requiredSpecialty", "General");
                    item.status = e.value("status", "PENDING");
                    item.reportedAtTimestamp = e.value("reportedAtTimestamp", (int64_t)0);
                    eq.enqueue(item);
                }
            }

            auto list = eq.getPrioritizedList();
            json listJson = json::array();
            for (const auto& item : list) {
                listJson.push_back(item.toJson());
            }
            response["prioritized"] = listJson;
            auto peekItem = eq.peek();
            if (peekItem.has_value()) {
                response["highestPriority"] = peekItem->toJson();
            } else {
                response["highestPriority"] = nullptr;
            }
            response["totalCount"] = eq.size();

        } else if (op == "rank_ambulances") {
            Graph g = buildGraphFromJson(req);
            std::string emergencyLocationId = req.value("emergencyLocationId", "");

            std::vector<AmbulanceCandidate> candidates;
            if (req.contains("ambulances") && req["ambulances"].is_array()) {
                for (const auto& a : req["ambulances"]) {
                    AmbulanceCandidate c;
                    c.id = a.value("id", "");
                    c.vehicleNumber = a.value("vehicleNumber", "");
                    c.type = a.value("type", "ALS");
                    c.currentLocationId = a.value("currentLocationId", "");
                    c.status = a.value("status", "AVAILABLE");
                    candidates.push_back(c);
                }
            }

            auto ranked = g.rankAmbulances(emergencyLocationId, candidates);
            json rankedJson = json::array();
            for (const auto& r : ranked) {
                rankedJson.push_back(r.toJson());
            }
            response["ranked"] = rankedJson;

        } else if (op == "rank_hospitals") {
            Graph g = buildGraphFromJson(req);
            std::string emergencyLocationId = req.value("emergencyLocationId", "");
            std::string requiredSpecialty = req.value("requiredSpecialty", "");

            std::vector<HospitalCandidate> candidates;
            if (req.contains("hospitals") && req["hospitals"].is_array()) {
                for (const auto& h : req["hospitals"]) {
                    HospitalCandidate hc;
                    hc.id = h.value("id", "");
                    hc.name = h.value("name", "");
                    hc.locationId = h.value("locationId", "");
                    hc.availableBeds = h.value("availableBeds", 0);
                    hc.totalBeds = h.value("totalBeds", 0);
                    if (h.contains("specialties") && h["specialties"].is_array()) {
                        for (const auto& sp : h["specialties"]) {
                            hc.specialties.push_back(sp.get<std::string>());
                        }
                    }
                    candidates.push_back(hc);
                }
            }

            auto ranked = g.rankHospitals(emergencyLocationId, requiredSpecialty, candidates);
            json rankedJson = json::array();
            for (const auto& r : ranked) {
                rankedJson.push_back(r.toJson());
            }
            response["ranked"] = rankedJson;

        } else if (op == "health") {
            response["status"] = "OK";
            response["engine"] = "RescueRoute C++17 DSA Engine v1.0.0";
            response["features"] = {
                "AdjacencyListWeightedGraph",
                "CustomBinaryMinHeap",
                "DijkstrasShortestPath",
                "EmergencyPriorityQueue",
                "BreadthFirstSearch",
                "DepthFirstSearch",
                "DynamicRoadObstructionHandling"
            };

        } else {
            response["success"] = false;
            response["error"] = "Unknown operation: '" + op + "'";
        }

        auto endTime = std::chrono::high_resolution_clock::now();
        double execMicroseconds = std::chrono::duration<double, std::micro>(endTime - startTime).count();
        response["executionTimeMicroseconds"] = execMicroseconds;

        // Write output strictly to stdout
        std::cout << response.dump() << std::endl;
        return 0;

    } catch (const json::parse_error& pe) {
        std::cerr << "JSON Parse error: " << pe.what() << std::endl;
        json err = {
            {"success", false},
            {"error", std::string("Malformed JSON syntax: ") + pe.what()}
        };
        std::cout << err.dump() << std::endl;
        return 0;
    } catch (const std::exception& ex) {
        std::cerr << "Exception: " << ex.what() << std::endl;
        json err = {
            {"success", false},
            {"error", std::string("C++ DSA Engine Error: ") + ex.what()}
        };
        std::cout << err.dump() << std::endl;
        return 0;
    }
}
