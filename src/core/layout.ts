import type { ConversationGraph, TreeLayout, TreeLayoutEdge, TreeLayoutNode } from '../shared/types';

const NODE_WIDTH = 236;
const NODE_HEIGHT = 78;
const HORIZONTAL_GAP = 28;
const VERTICAL_GAP = 48;

interface LayoutContext {
  graph: ConversationGraph;
  positions: Map<string, { x: number; y: number }>;
  subtreeWidth: Map<string, number>;
  visited: Set<string>;
}

function measureSubtree(ctx: LayoutContext, nodeId: string): number {
  const node = ctx.graph.nodes[nodeId];
  const children = node?.children ?? [];
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
  const node = ctx.graph.nodes[nodeId];
  const children = node?.children ?? [];
  const ownWidth = ctx.subtreeWidth.get(nodeId) ?? NODE_WIDTH;
  let cursor = left;

  for (const childId of children) {
    const childWidth = ctx.subtreeWidth.get(childId) ?? NODE_WIDTH;
    placeSubtree(ctx, childId, cursor, depth + 1);
    cursor += childWidth + HORIZONTAL_GAP;
  }

  const childCenters = children.map((childId) => ctx.positions.get(childId)?.x ?? cursor);
  const center = childCenters.length
    ? (Math.min(...childCenters) + Math.max(...childCenters)) / 2
    : left + ownWidth / 2;

  ctx.positions.set(nodeId, {
    x: center - NODE_WIDTH / 2,
    y: depth * (NODE_HEIGHT + VERTICAL_GAP),
  });
}

function getRootIds(graph: ConversationGraph): string[] {
  const nodes = Object.values(graph.nodes);
  const childIds = new Set(nodes.flatMap((node) => node.children));
  const roots = nodes
    .filter((node) => !node.parentId || !childIds.has(node.id))
    .map((node) => node.id);

  if (roots.length > 0) {
    return roots;
  }

  return nodes.slice(0, 1).map((node) => node.id);
}

function edgePath(
  source: { x: number; y: number; width: number; height: number },
  target: { x: number; y: number; width: number; height: number },
): string {
  const x1 = source.x + source.width / 2;
  const y1 = source.y + source.height;
  const x2 = target.x + target.width / 2;
  const y2 = target.y;
  const offset = Math.max(24, Math.abs(x2 - x1) * 0.48);
  return `M ${x1} ${y1} C ${x1} ${y1 + offset}, ${x2} ${y2 - offset}, ${x2} ${y2}`;
}

export function buildTreeLayout(graph: ConversationGraph): TreeLayout {
  const ctx: LayoutContext = {
    graph,
    positions: new Map(),
    subtreeWidth: new Map(),
    visited: new Set(),
  };

  const roots = getRootIds(graph);
  const rootsTotalWidth = roots.reduce((sum, rootId) => sum + measureSubtree(ctx, rootId), 0);
  const horizontalMargin = 72;
  let cursor = horizontalMargin;

  for (const rootId of roots) {
    const width = ctx.subtreeWidth.get(rootId) ?? NODE_WIDTH;
    placeSubtree(ctx, rootId, cursor, 0);
    cursor += width + HORIZONTAL_GAP * 1.6;
  }

  const nodes: TreeLayoutNode[] = graph.nodes && Object.keys(graph.nodes).length
    ? Object.entries(graph.nodes).map(([id, node]) => {
        const position = ctx.positions.get(id) ?? { x: 0, y: 0 };
        return {
          id,
          x: position.x,
          y: position.y,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          node,
        };
      })
    : [];

  const edges: TreeLayoutEdge[] = [];

  for (const node of Object.values(graph.nodes)) {
    const sourcePosition = ctx.positions.get(node.id);
    if (!sourcePosition) {
      continue;
    }

    for (const childId of node.children) {
      const targetPosition = ctx.positions.get(childId);
      if (!targetPosition) {
        continue;
      }

      edges.push({
        source: node.id,
        target: childId,
        path: edgePath(
          {
            ...sourcePosition,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
          },
          {
            ...targetPosition,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
          },
        ),
      });
    }
  }

  const maxX = Math.max(...nodes.map((node) => node.x + node.width), 0);
  const maxY = Math.max(...nodes.map((node) => node.y + node.height), 0);

  return {
    width: Math.max(1200, maxX + horizontalMargin),
    height: Math.max(480, maxY + 72),
    nodes,
    edges,
    roots,
  };
}
