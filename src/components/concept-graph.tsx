"use client";
import { useMemo, useState } from "react";
import { ReactFlow, Background, Controls, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Concept, Mastery, Misconception, Prerequisite } from "@/lib/types";
import { masteryLabel } from "@/lib/learning/engine";
import { Badge } from "@/components/ui/badge";
export function ConceptGraph({ concepts, prerequisites, mastery = [], misconceptions = [] }: { concepts: Concept[]; prerequisites: Prerequisite[]; mastery?: Mastery[]; misconceptions?: Misconception[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { nodes, edges } = useMemo(() => {
    const levels = new Map<string, number>();
    function level(id: string, visited = new Set<string>()): number {
      if (levels.has(id)) return levels.get(id)!;
      if (visited.has(id)) return 0;
      visited.add(id);
      const deps = prerequisites.filter(p => p.concept_id === id);
      const n = deps.length ? 1 + Math.max(...deps.map(p => level(p.prerequisite_id, new Set(visited)))) : 0;
      levels.set(id, n); return n;
    }
    const rows = new Map<number, number>();
    const nodes: Node[] = concepts.map(c => {
      const x = level(c.id); const row = rows.get(x) ?? 0; rows.set(x, row + 1);
      const m = mastery.find(m => m.concept_id === c.id); const status = masteryLabel(m, misconceptions);
      const color = status === "Mastered" ? "#087f80" : status === "Needs attention" ? "#b77a18" : status === "Developing" ? "#3679ba" : "#8093a2";
      return { id: c.id, position: { x: x * 245, y: row * 110 }, data: { label: <div className="text-left"><p className="font-semibold">{c.title}</p><p className="mt-1 text-xs" style={{ color }}>{status}{m ? ` · ${Math.round(m.score * 100)}%` : ""}</p></div> }, style: { width: 205, padding: 14, background: "white", border: `1.5px solid ${color}`, borderRadius: 10 }, sourcePosition: "right" as Node["sourcePosition"], targetPosition: "left" as Node["targetPosition"] };
    });
    const edges: Edge[] = prerequisites.map(p => ({ id: `${p.prerequisite_id}-${p.concept_id}`, source: p.prerequisite_id, target: p.concept_id, type: "smoothstep", style: { stroke: "#b6c8d0" } }));
    return { nodes, edges };
  }, [concepts, prerequisites, mastery, misconceptions]);
  const chosen = concepts.find(c => c.id === selected);
  return <div><div className="mb-3 flex flex-wrap gap-2"><Badge tone="teal">Mastered</Badge><Badge tone="blue">Developing</Badge><Badge tone="amber">Needs attention</Badge><Badge>Not assessed</Badge></div><div className="h-[360px] overflow-hidden rounded-lg border bg-slate-50 sm:h-[420px]" aria-label="Concept prerequisite graph"><ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.15 }} nodesDraggable={false} nodesConnectable={false} minZoom={0.15} maxZoom={1.5} onNodeClick={(_, node) => setSelected(node.id)} panOnScroll={false} zoomOnScroll={false}><Background gap={20} color="#d9e3e8" /><Controls showInteractive={false} /></ReactFlow></div><p className="mt-3 text-xs leading-5 text-muted-foreground">Connections run from prerequisite to dependent concept. Select a concept for details; use the controls to zoom.</p>{chosen && <div className="mt-3 rounded-lg bg-muted p-4 text-sm"><h3 className="font-semibold">{chosen.title}</h3><p className="mt-2 leading-6 text-muted-foreground">{chosen.summary}</p></div>}</div>;
}
