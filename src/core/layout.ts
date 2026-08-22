import type { ConversationGraph, TreeLayout, TreeLayoutEdge, TreeLayoutNode } from '../shared/types';

const NODE_WIDTH = 236;
const NODE_HEIGHT = 78;
const HORIZONTAL_GAP = 36;
const VERTICAL_GAP = 52;

interface LayoutContext {
  graph: ConversationGraph;
  activeSet: Set<string>;
  collapsed: Record<string, boolean>;
  positions: Map<string, { x: number; y: number }>;
  subtreeWidth: Map<string, number>;
  visited: Set<string>;
}

function getVisibleChildren(ctx: LayoutContext, nodeId: string): string[] {
  const node = ctx.graph.nodes[nodeId];
  if (!node || node.children.length === 0) {
    return [];
  }

  const hasBranches = node.children.length > 1;
  const isCollapsed = ctx.collapsed[nodeId] ?? hasBranches;
  if (isCollapsed) {
    const activeChild = node.children.find((childId) => ctx.activeSet.has(childId)) || node.children[0];
    return activeChild ? [activeChild] : [];
  }

  return node.children;
}

function measureSubtree(ctx: LayoutContext, nodeId: string): number {
  const children = getVisibleChildren(ctx, nodeId);
  const width = children.reduce(
    (sum, childId) => sum + measureSubtree(ctx, childId),
    0,
  );

  const ownWidth = Math.max(NODE_WIDTH, width + Math.max(0, children.length - 1) * HORIZONTAL_GAP);
  ctx.subtreeWidth.set(nodeId, ownWidth);
  return ownWidth;
}

function placeSubtree(ctx: LayoutContext, nodeId: string, left: number, depth: number): void {
  if (ctx.visited.has(nodeId)) {
    return;
  }

  ctx.visited.add(nodeId);
  const children = getVisibleChildren(ctx, nodeId);
  const ownWidth = ctx.subtreeWidth.get(nodeId) ?? NODE_WIDTH;
  let cursor = left;

  for (const childId of children) {
    const childWidth = ctx.subtreeWidth.get(childId) ?? NODE_WIDTH;
    placeSubtree(ctx, childId, cursor, depth + 1);
    cursor += childWidth + HORIZONTAL_GAP;
  }

  const activeChildId = children.find((childId) => ctx.activeSet.has(childId));
  const activeChildPos = activeChildId ? ctx.positions.get(activeChildId) : null;

  let nodeX: number;
  if (activeChildPos) {
    nodeX = activeChildPos.x;
  } else if (children.length > 0) {
    const childCenters = children.map((childId) => (ctx.positions.get(childId)?.x ?? cursor) + NODE_WIDTH / 2);
    const center = (Math.min(...childCenters) + Math.max(...childCenters)) / 2;
    nodeX = center - NODE_WIDTH / 2;
  } else {
    nodeX = left + ownWidth / 2 - NODE_WIDTH / 2;
  }

  ctx.positions.set(nodeId, {
    x: nodeX,
    y: depth * (NODE_HEIGHT + VERTICAL_GAP),
  });
}

function getRootIds(graph: ConversationGraph): string[] {
  const nodes = Object.values(graph.nodes);
  const childIds = new Set(nodes.flatMap((node) => node.children));
  const roots = nodes
    .filter((node) => !node.parentId || (!childIds.has(node.id) && !node.parentId))
    .map((node) => node.id);

  if (roots.length > 0) {
    return roots;
  }

  return nodes.slice(0, 1).map((node) => node.id);
}

export function orthogonalEdgePath(
  source: { x: number; y: number; width: number; height: number },
  target: { x: number; y: number; width: number; height: number },
): string {
  const x1 = source.x + source.width / 2;
  const y1 = source.y + source.height;
  const x2 = target.x + target.width / 2;
  const y2 = target.y;

  if (Math.abs(x1 - x2) < 1) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  const midY = y1 + (y2 - y1) / 2;
  return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
}

export function buildTreeLayout(
  graph: ConversationGraph,
  collapsed: Record<string, boolean> = {},
): TreeLayout {
  const activeSet = new Set(graph.activePath);
  const ctx: LayoutContext = {
    graph,
    activeSet,
    collapsed,
    positions: new Map(),
    subtreeWidth: new Map(),
    visited: new Set(),
  };

  const roots = getRootIds(graph);
  const horizontalMargin = 72;
  let cursor = horizontalMargin;

  for (const rootId of roots) {
    const width = ctx.subtreeWidth.get(rootId) ?? measureSubtree(ctx, rootId);
    placeSubtree(ctx, rootId, cursor, 0);
    cursor += width + HORIZONTAL_GAP * 1.6;
  }

  const nodes: TreeLayoutNode[] = [];
  const edges: TreeLayoutEdge[] = [];

  for (const [id, position] of ctx.positions.entries()) {
    const node = graph.nodes[id];
    if (!node) {
      continue;
    }

    const hasBranches = node.children.length > 1;
    const isNodeCollapsed = collapsed[node.id] ?? hasBranches;
    const isMainline = activeSet.has(node.id);

    nodes.push({
      id,
      x: position.x,
      y: position.y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      node,
      isMainline,
      hasBranches,
      branchCount: node.children.length,
      isCollapsed: isNodeCollapsed,
    });

    const visibleChildren = getVisibleChildren(ctx, id);
    for (const childId of visibleChildren) {
      const targetPosition = ctx.positions.get(childId);
      if (!targetPosition) {
        continue;
      }

      edges.push({
        source: id,
        target: childId,
        path: orthogonalEdgePath(
          { ...position, width: NODE_WIDTH, height: NODE_HEIGHT },
          { ...targetPosition, width: NODE_WIDTH, height: NODE_HEIGHT },
        ),
      });
    }
  }

  const minX = nodes.length ? Math.min(...nodes.map((n) => n.x)) : 0;
  const maxX = nodes.length ? Math.max(...nodes.map((n) => n.x + n.width)) : 1000;
  const maxY = nodes.length ? Math.max(...nodes.map((n) => n.y + n.height)) : 400;

  return {
    width: Math.max(1200, maxX - minX + horizontalMargin * 2),
    height: Math.max(480, maxY + 72),
    nodes,
    edges,
    roots,
  };
}
