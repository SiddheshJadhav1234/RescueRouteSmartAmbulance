import React, { useState } from 'react';
import { BookOpen, Cpu, Database, Network, ChevronDown, ChevronUp, CheckCircle, Code2, Layers, Award } from 'lucide-react';

export const DocsPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const vivaQuestions = [
    {
      q: 'Q1: Why did you implement a custom Binary Min-Heap instead of using C++ std::priority_queue?',
      a: `In standard C++ std::priority_queue, there is NO decreaseKey() or remove(id) operation. If an edge weight decreases during Dijkstra's algorithm, std::priority_queue requires pushing a duplicate (lazy deletion), ballooning heap size to O(E) and leaving stale entries. In emergency triage, if a patient's condition escalates from Medium to Critical or an emergency is cancelled, std::priority_queue leaves orphan records that could cause a wrong dispatch.
Our custom MinHeap maintains a hash table posMap_ mapping item IDs to array indices. This enables textbook O(log V) decreaseKey() and O(log N) in-place deletion, keeping the heap strictly bounded to O(V) and eliminating stale entries.`,
    },
    {
      q: "Q2: What is the time complexity of Dijkstra's algorithm in RescueRoute?",
      a: `RescueRoute uses an Adjacency List representation and an Indexed Binary Min-Heap.
- Vertex insertion & extraction: V vertices are extracted from the heap, each taking O(log V) time -> O(V log V).
- Edge relaxation & decreaseKey: Each edge (E edges in total) is inspected once in directed graphs (twice in undirected) and may trigger a decreaseKey operation taking O(log V) time -> O(E log V).
Combining these gives the classic textbook complexity: O((V + E) log V).
In real-world road networks where graphs are sparse (E = k * V, k ≈ 2-4), this runs in near-linear O(V log V), far outperforming naive matrix Dijkstra which requires O(V²).`,
    },
    {
      q: 'Q3: Why is Adjacency List chosen over Adjacency Matrix for city road networks?',
      a: `City street graphs are highly sparse planar or near-planar networks. In Pune Metro with 10 key nodes, there are 13 major road links (26 directed edges).
- Adjacency Matrix space is O(V²) = 100 entries, of which 74% are empty zeros. For a city with 10,000 intersections, a matrix would require 100,000,000 cells (400 MB RAM).
- Adjacency List space is O(V + E), storing only actual road segments. Iterating over adjacent neighbors during Dijkstra takes O(degree(u)) instead of scanning all V columns, providing massive speedups.`,
    },
    {
      q: 'Q4: How does the Emergency Priority Queue ensure both severity triage and FIFO fairness?',
      a: `The Priority Queue uses a composite lexicographical key: KeyType = std::pair<int, int64_t>(SeverityRank, ReportedTimestamp).
- C++ std::pair compares the first element first (1 = CRITICAL, 2 = HIGH, 3 = MEDIUM, 4 = LOW). Therefore, a Critical emergency (1, t_now) will ALWAYS have a smaller key than a Low emergency (4, t_earlier), so Critical is extracted first.
- When two emergencies have identical severity (e.g. both CRITICAL), pair::operator< falls back to comparing the second element: the epoch millisecond timestamp. The earlier call has a smaller timestamp, guaranteeing strict FIFO fairness within the same triage category.`,
    },
    {
      q: 'Q5: How does the system handle dynamic road closures or obstructions?',
      a: `Every edge in the Graph struct has an isBlocked boolean flag and roadId identifier.
When an operator marks a road as blocked:
1. Graph::blockRoad(roadId) toggles edge.isBlocked = true in both forward and reverse adjacency vectors.
2. During the Dijkstra relaxation loop: if (edge.isBlocked) continue; — the algorithm treats the link as non-traversable with infinite impedance.
3. Dijkstra automatically discovers the optimal alternate detour path in microseconds without rebuilding the entire graph!`,
    },
    {
      q: 'Q6: How do you prevent double-booking of ambulances in concurrent environments?',
      a: `In multi-operator environments, two dispatchers might attempt to assign the same closest ambulance simultaneously.
RescueRoute enforces concurrency-safety:
1. Conditional Atomic Lock: Before confirming dispatch, dbService verifies: if (ambulance.status !== 'AVAILABLE') throw Error('Double-booking prevented').
2. In PostgreSQL, this is backed by an atomic update: UPDATE ambulances SET status = 'DISPATCHED' WHERE id = $1 AND status = 'AVAILABLE'.
3. If zero rows are affected, the transaction aborts, and the system prompts the operator to select another available unit.`,
    },
    {
      q: 'Q7: How does Node.js communicate with the compiled C++ engine safely?',
      a: `We use Node.js child_process.spawn with an argument array (preventing shell injection).
1. Structured JSON is streamed directly into the C++ process's stdin.
2. The C++ executable reads standard input, executes the DSA operation, and prints the result strictly as a single JSON line to stdout.
3. Diagnostic logging is routed exclusively to stderr so JSON parsing never fails.
4. An 8-second execution timeout guard and exit-code validation prevent hanging processes or resource leaks.`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-base font-bold text-white">RescueRoute Academic & Viva Defense Guide</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Comprehensive architectural breakdown, DSA rationale, and viva Q&A for college project evaluation
          </p>
        </div>
      </div>

      {/* System Architecture Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>System Architecture & Integration Pipeline</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-blue-700 flex items-center gap-1.5">
              <Code2 className="w-4 h-4" />
              <span>1. Frontend UI</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              React 19 + TypeScript + Tailwind CSS. Renders interactive Leaflet OpenStreetMap with custom SVG markers, dynamic priority queues, and live route polylines.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-emerald-700 flex items-center gap-1.5">
              <Cpu className="w-4 h-4" />
              <span>2. Express Backend</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              Node.js TypeScript server with REST endpoints. Enforces input validation (Zod), concurrency locking, and invokes the C++ engine via non-blocking child_process.spawn.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-purple-700 flex items-center gap-1.5">
              <Network className="w-4 h-4" />
              <span>3. C++17 DSA Engine</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              Standalone high-performance binary: Adjacency List Graph, Custom Indexed Min-Heap, Dijkstra Shortest Path, Priority Queue, and BFS/DFS.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-amber-700 flex items-center gap-1.5">
              <Database className="w-4 h-4" />
              <span>4. PostgreSQL DB</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              Supabase PostgreSQL database with UUID keys, foreign key constraints, Row Level Security (RLS), and transactional concurrency guarantees.
            </p>
          </div>
        </div>
      </div>

      {/* College Viva Questions & Answers Accordion */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>College Viva Examination Q&A (Examiner Prep)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Curated questions typically asked by external examiners during final year DSA project presentations
            </p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
            7 Essential Questions
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {vivaQuestions.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="p-4 hover:bg-slate-50/50 transition">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-900 gap-3"
                >
                  <span className="text-blue-900 text-[13px]">{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="mt-3 text-xs text-slate-700 leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100/80 whitespace-pre-line font-sans">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step-by-Step Demo Walkthrough */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Recommended Live Demo Sequence for Examiners</span>
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700">
          <li>
            <b>Show Dashboard:</b> Observe the 10 Pune locations, available ambulances, and initial pending emergencies.
          </li>
          <li>
            <b>Register an Emergency:</b> Click "Register Emergency" and enter a patient with <i>CRITICAL</i> severity at Hinjewadi Phase 1.
          </li>
          <li>
            <b>Verify Priority Queue:</b> Go to "Emergency Queue" and demonstrate that the Critical incident was inserted at the very top of the custom Min-Heap.
          </li>
          <li>
            <b>Run Algorithmic Dispatch:</b> Click "Dispatch" on the Critical emergency. Show that the C++ Dijkstra engine ranked the Wakad ambulance first (8.0 min ETA) and Jupiter Hospital (Baner) as the top specialized facility.
          </li>
          <li>
            <b>Simulate Road Closure:</b> Go to "Route Planner" or "Road Network" and toggle <i>Hinjewadi-Wakad Bridge Road</i> to <b>BLOCKED</b>.
          </li>
          <li>
            <b>Verify Dynamic Detour:</b> Calculate the route again. Point out how the C++ engine avoided the blocked link and took an alternate route with increased travel time.
          </li>
          <li>
            <b>Demonstrate BFS/DFS:</b> On "Roads & BFS/DFS", execute BFS and DFS from Hinjewadi to show step-by-step level traversal order.
          </li>
          <li>
            <b>Complete Mission:</b> Return to the active mission and click "Complete Mission" to show the ambulance released back to AVAILABLE.
          </li>
        </ol>
      </div>
    </div>
  );
};
