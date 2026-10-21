#pragma once

#include "Models.hpp"
#include "MinHeap.hpp"
#include <string>
#include <vector>
#include <utility>
#include <optional>

namespace RescueRoute {

/**
 * Emergency Priority Queue
 *
 * Implemented on top of the custom MinHeap.
 *
 * Priority Criteria:
 *   1. Severity Rank:
 *        1 = CRITICAL (Immediate life threat: cardiac arrest, severe trauma)
 *        2 = HIGH     (Severe illness/injury: stroke symptoms, fracture with bleeding)
 *        3 = MEDIUM   (Moderate conditions: high fever, closed fractures)
 *        4 = LOW      (Minor injuries, stable transfers)
 *   2. Timestamp:
 *        Earlier reported emergencies (smaller epoch milliseconds) are dispatched first (FIFO within priority level).
 *
 * The Priority Key is std::pair<int, int64_t>:
 *   KeyType = (severityRank, reportedAtTimestamp)
 *   Using lexicographical comparison: (1, t1) < (2, t2) always, and (1, 100) < (1, 200).
 *
 * Anti-Stale Mechanism:
 *   The indexed MinHeap maintains posMap_ mapping emergency ID -> heap array index.
 *   When an emergency status changes (assigned, cancelled, severity escalated),
 *   it is directly updated or removed in O(log N) rather than marking it lazy,
 *   guaranteeing no stale entries exist in the queue.
 */
class EmergencyQueue {
public:
    using PriorityKey = std::pair<int, int64_t>;

private:
    MinHeap<EmergencyItem, PriorityKey> heap_;

    static PriorityKey makeKey(const EmergencyItem& item) {
        return {static_cast<int>(item.severity), item.reportedAtTimestamp};
    }

public:
    EmergencyQueue() = default;

    bool isEmpty() const {
        return heap_.isEmpty();
    }

    size_t size() const {
        return heap_.size();
    }

    bool contains(const std::string& id) const {
        return heap_.contains(id);
    }

    void enqueue(const EmergencyItem& item) {
        heap_.insert(item.id, item, makeKey(item));
    }

    std::optional<EmergencyItem> dequeue() {
        if (heap_.isEmpty()) {
            return std::nullopt;
        }
        auto minNode = heap_.extractMin();
        return minNode.data;
    }

    std::optional<EmergencyItem> peek() const {
        if (heap_.isEmpty()) {
            return std::nullopt;
        }
        return heap_.peekMin().data;
    }

    bool remove(const std::string& id) {
        return heap_.remove(id);
    }

    bool update(const EmergencyItem& updatedItem) {
        return heap_.updateKey(updatedItem.id, updatedItem, makeKey(updatedItem));
    }

    void clear() {
        heap_.clear();
    }

    // Returns a prioritized list of all emergencies currently in the queue without consuming it
    std::vector<EmergencyItem> getPrioritizedList() const {
        // Clone heap to extract in priority order
        MinHeap<EmergencyItem, PriorityKey> tempHeap = heap_;
        std::vector<EmergencyItem> result;
        result.reserve(tempHeap.size());
        while (!tempHeap.isEmpty()) {
            result.push_back(tempHeap.extractMin().data);
        }
        return result;
    }
};

} // namespace RescueRoute
