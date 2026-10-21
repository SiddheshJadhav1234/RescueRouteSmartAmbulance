#pragma once

#include <vector>
#include <unordered_map>
#include <stdexcept>
#include <string>
#include <utility>
#include <iostream>

namespace RescueRoute {

/**
 * Custom Binary Min-Heap with Indexed Position Map.
 *
 * Provides:
 *  - O(log N) insert
 *  - O(log N) extractMin
 *  - O(1) peekMin
 *  - O(log N) decreaseKey / updateKey by ID
 *  - O(log N) remove by ID
 *
 * Internal representation:
 *  - 0-indexed array stored in std::vector
 *  - For node at index i:
 *      Parent(i)      = (i - 1) / 2
 *      LeftChild(i)   = 2 * i + 1
 *      RightChild(i)  = 2 * i + 2
 *  - posMap: tracks the current index of each item in the heap for O(1) index lookup,
 *    enabling textbook O(log V) decreaseKey in Dijkstra and avoiding stale entries in priority queues.
 */
template <typename T, typename KeyType = double>
class MinHeap {
public:
    struct Node {
        std::string id;
        T data;
        KeyType key; // Min-heap orders by key ascending
    };

private:
    std::vector<Node> heap_;
    std::unordered_map<std::string, size_t> posMap_; // id -> index in heap_

    size_t parent(size_t i) const { return (i - 1) / 2; }
    size_t leftChild(size_t i) const { return 2 * i + 1; }
    size_t rightChild(size_t i) const { return 2 * i + 2; }

    void swapNodes(size_t i, size_t j) {
        std::swap(heap_[i], heap_[j]);
        posMap_[heap_[i].id] = i;
        posMap_[heap_[j].id] = j;
    }

    void heapifyUp(size_t index) {
        while (index > 0 && heap_[index].key < heap_[parent(index)].key) {
            size_t p = parent(index);
            swapNodes(index, p);
            index = p;
        }
    }

    void heapifyDown(size_t index) {
        size_t n = heap_.size();
        while (true) {
            size_t smallest = index;
            size_t l = leftChild(index);
            size_t r = rightChild(index);

            if (l < n && heap_[l].key < heap_[smallest].key) {
                smallest = l;
            }
            if (r < n && heap_[r].key < heap_[smallest].key) {
                smallest = r;
            }

            if (smallest != index) {
                swapNodes(index, smallest);
                index = smallest;
            } else {
                break;
            }
        }
    }

public:
    MinHeap() = default;

    bool isEmpty() const {
        return heap_.empty();
    }

    size_t size() const {
        return heap_.size();
    }

    bool contains(const std::string& id) const {
        return posMap_.find(id) != posMap_.end();
    }

    const Node& peekMin() const {
        if (isEmpty()) {
            throw std::runtime_error("Heap is empty: cannot peek min.");
        }
        return heap_[0];
    }

    void insert(const std::string& id, const T& data, KeyType key) {
        if (contains(id)) {
            // If already present, update key
            updateKey(id, data, key);
            return;
        }
        size_t index = heap_.size();
        heap_.push_back({id, data, key});
        posMap_[id] = index;
        heapifyUp(index);
    }

    Node extractMin() {
        if (isEmpty()) {
            throw std::runtime_error("Heap is empty: cannot extract min.");
        }
        Node root = heap_[0];
        posMap_.erase(root.id);

        if (heap_.size() == 1) {
            heap_.pop_back();
            return root;
        }

        heap_[0] = heap_.back();
        heap_.pop_back();
        posMap_[heap_[0].id] = 0;
        heapifyDown(0);

        return root;
    }

    bool decreaseKey(const std::string& id, KeyType newKey) {
        auto it = posMap_.find(id);
        if (it == posMap_.end()) return false;

        size_t index = it->second;
        if (newKey > heap_[index].key) {
            // Not a decrease
            return false;
        }
        heap_[index].key = newKey;
        heapifyUp(index);
        return true;
    }

    bool updateKey(const std::string& id, const T& newData, KeyType newKey) {
        auto it = posMap_.find(id);
        if (it == posMap_.end()) return false;

        size_t index = it->second;
        KeyType oldKey = heap_[index].key;
        heap_[index].data = newData;
        heap_[index].key = newKey;

        if (newKey < oldKey) {
            heapifyUp(index);
        } else if (newKey > oldKey) {
            heapifyDown(index);
        }
        return true;
    }

    bool remove(const std::string& id) {
        auto it = posMap_.find(id);
        if (it == posMap_.end()) return false;

        size_t index = it->second;
        posMap_.erase(it);

        if (index == heap_.size() - 1) {
            heap_.pop_back();
            return true;
        }

        KeyType oldKey = heap_[index].key;
        heap_[index] = heap_.back();
        heap_.pop_back();
        posMap_[heap_[index].id] = index;

        if (heap_[index].key < oldKey) {
            heapifyUp(index);
        } else {
            heapifyDown(index);
        }
        return true;
    }

    void clear() {
        heap_.clear();
        posMap_.clear();
    }

    // Inspection method for educational / debugging visualization
    const std::vector<Node>& getRawElements() const {
        return heap_;
    }
};

} // namespace RescueRoute
