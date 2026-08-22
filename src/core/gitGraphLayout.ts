import type { ConversationGraph, MessageNode } from '../shared/types';

export const BRANCH_COLORS = [
  '#10a37f', // Lane 0: Main (OpenAI Emerald)
  '#f59e0b', // Lane 1: Amber
  '#3b82f6', // Lane 2: Blue
  '#8b5cf6', // Lane 3: Purple
  '#ec4899', // Lane 4: Pink
  '#06b6d4', // Lane 5: Cyan
  '#f97316', // Lane 6: Orange
  '#14b8a6', // Lane 7: Teal
];

export interface GitGraphRow {
  id: string;
  node: MessageNode;
  row: number;
  lane: number;
  color: string;
  isMainline: boolean;
  isActive: boolean;
  hasBranches: boolean;
  branchCount: number;
  forkFromId?: string | null;
}

export interface GitGraphRailSegment {
  id: string;
  fromRow: number;
  toRow: number;
  fromLane: number;
  toLane: number;
  color: string;
  isActive: boolean;
  path: string;
}

export interface GitGraphLayout {
  rows: GitGraphRow[];
  segments: GitGraphRailSegment[];
  totalLanes: number;
  laneWidth: number;
  rowHeight: number;
  totalHeight: number;
}

export function computeGitGraphLayout(
  graph: ConversationGraph,
  rowHeight = 88,
  laneWidth = 22,
): GitGraphLayout {
  const activeSet = new Set(graph.activePath);
  const nodes = graph.nodes;

  if (!graph.rootId || !nodes[graph.rootId]) {
    // Fallback: find any node without parent
    const childIds = new Set(Object.values(nodes).flatMap((n) => n.children));
    const roots = Object.keys(nodes).filter((id) => !nodes[id].parentId || (!childIds.has(id) && !nodes[id].parentId));
    if (roots.length === 0) {
      return { rows: [], segments: [], totalLanes: 1, laneWidth, rowHeight, totalHeight: 0 };
    }
  }

  // 1. Order nodes topologically (Mainline first, then side branches)
  const orderedNodeIds: string[] = [];
  const nodeLanes = new Map<string, number>();
  const visited = new Set<string>();

  let nextAvailableLane = 1;

  function traverse(nodeId: string, currentLane: number) {
    if (visited.has(nodeId) || !nodes[nodeId]) {
      return;
    }

    visited.add(nodeId);
    orderedNodeIds.push(nodeId);
    nodeLanes.set(nodeId, currentLane);

    const node = nodes[nodeId];
    if (!node.children || node.children.length === 0) {
      return;
    }

    // Sort children: active child goes first (continues same lane), then other branches
    const children = [...node.children].filter((id) => nodes[id]);
    children.sort((a, b) => {
      const aActive = activeSet.has(a);
      const bActive = activeSet.has(b);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return (nodes[a].createdAt ?? 0) - (nodes[b].createdAt ?? 0);
    });

    // First child continues in current lane
    const primaryChild = children[0];
    if (primaryChild) {
      traverse(primaryChild, currentLane);
    }

    // Secondary children branch off into new lanes
    for (let i = 1; i < children.length; i++) {
      const branchLane = nextAvailableLane++;
      traverse(children[i], branchLane);
    }
  }

  const rootId = graph.rootId && nodes[graph.rootId] ? graph.rootId : Object.keys(nodes)[0];
  if (rootId) {
    traverse(rootId, 0);
  }

  // Catch any detached nodes
  for (const id of Object.keys(nodes)) {
    if (!visited.has(id)) {
      traverse(id, nextAvailableLane++);
    }
  }

  const nodeRowIndex = new Map<string, number>();
  orderedNodeIds.forEach((id, idx) => {
    nodeRowIndex.set(id, idx);
  });

  const totalLanes = Math.max(1, nextAvailableLane);
  const rows: GitGraphRow[] = [];

  for (let r = 0; r < orderedNodeIds.length; r++) {
    const id = orderedNodeIds[r];
    const node = nodes[id];
    const lane = nodeLanes.get(id) ?? 0;
    const isMainline = lane === 0;
    const isActive = activeSet.has(id);
    const color = BRANCH_COLORS[lane % BRANCH_COLORS.length];
    const hasBranches = (node.children?.length ?? 0) > 1;
    const branchCount = Math.max(0, (node.children?.length ?? 0) - 1);

    rows.push({
      id,
      node,
      row: r,
      lane,
      color,
      isMainline,
      isActive,
      hasBranches,
      branchCount,
      forkFromId: node.parentId,
    });
  }

  // 2. Generate rail connecting segments
  const segments: GitGraphRailSegment[] = [];
  const lanePadding = 16;

  for (const fromId of orderedNodeIds) {
    const fromRow = nodeRowIndex.get(fromId)!;
    const fromLane = nodeLanes.get(fromId)!;
    const fromColor = BRANCH_COLORS[fromLane % BRANCH_COLORS.length];
    const node = nodes[fromId];

    for (const toId of node.children) {
      if (!nodeRowIndex.has(toId)) {
        continue;
      }

      const toRow = nodeRowIndex.get(toId)!;
      const toLane = nodeLanes.get(toId)!;
      const isActive = activeSet.has(fromId) && activeSet.has(toId);
      const color = toLane === fromLane ? fromColor : BRANCH_COLORS[toLane % BRANCH_COLORS.length];

      const x1 = lanePadding + fromLane * laneWidth;
      const y1 = fromRow * rowHeight + rowHeight / 2;
      const x2 = lanePadding + toLane * laneWidth;
      const y2 = toRow * rowHeight + rowHeight / 2;

      let path = '';
      if (fromLane === toLane) {
        // Straight rail down the same lane
        path = `M ${x1} ${y1} L ${x2} ${y2}`;
      } else {
        // Fork rail branching off to a new lane with smooth cubic bezier curve
        const midY = (y1 + y2) / 2;
        path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
      }

      segments.push({
        id: `${fromId}->${toId}`,
        fromRow,
        toRow,
        fromLane,
        toLane,
        color,
        isActive,
        path,
      });
    }
  }

  return {
    rows,
    segments,
    totalLanes,
    laneWidth,
    rowHeight,
    totalHeight: rows.length * rowHeight,
  };
}
