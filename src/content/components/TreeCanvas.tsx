import { useEffect, useMemo, useRef, useState } from 'react';
import { buildTreeLayout } from '../../core/layout';
import { useConversationTreeStore } from '../store';
import type { MessageNode } from '../../shared/types';

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function truncate(value: string, length: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > length ? `${clean.slice(0, length)}…` : clean;
}

function roleLabel(node: MessageNode): string {
  if (node.role === 'assistant') {
    return '回复';
  }

  if (node.role === 'tool') {
    return '工具';
  }

  if (node.role === 'system') {
    return '系统';
  }

  return '提问';
}

function nodeAccent(node: MessageNode): string {
  if (node.active) {
    return 'var(--ctree-accent)';
  }

  if (node.role === 'assistant') {
    return 'var(--ctree-assistant)';
  }

  if (node.role === 'tool') {
    return 'var(--ctree-tool)';
  }

  return 'var(--ctree-user)';
}

export function TreeCanvas() {
  const graph = useConversationTreeStore((state) => state.graph);
  const selectedNodeId = useConversationTreeStore((state) => state.selectedNodeId);
  const searchQuery = useConversationTreeStore((state) => state.searchQuery);
  const setSelectedNodeId = useConversationTreeStore((state) => state.setSelectedNodeId);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, width: 1200, height: 600 });
  const dragState = useRef<{ startX: number; startY: number; viewX: number; viewY: number } | null>(null);

  const layout = useMemo(() => {
    if (!graph) {
      return null;
    }

    return buildTreeLayout(graph);
  }, [graph]);

  useEffect(() => {
    if (!layout) {
      return;
    }

    setViewBox({
      x: -32,
      y: -20,
      width: Math.max(containerRef.current?.clientWidth ?? 800, layout.width),
      height: Math.max(containerRef.current?.clientHeight ?? 500, layout.height),
    });
  }, [layout]);

  if (!graph || !layout) {
    return null;
  }

  const activeSet = new Set(graph.activePath);
  const query = searchQuery.trim().toLowerCase();

  const visibleNodeIds = new Set<string>();

  if (query) {
    for (const node of layout.nodes) {
      const matches = `${node.node.title} ${node.node.content}`.toLowerCase().includes(query);
      if (matches) {
        visibleNodeIds.add(node.id);
        let cursor = node.node.parentId;
        while (cursor && graph.nodes[cursor]) {
          visibleNodeIds.add(cursor);
          cursor = graph.nodes[cursor].parentId;
        }
      }
    }
  } else {
    for (const node of layout.nodes) {
      visibleNodeIds.add(node.id);
    }
  }

  const visibleNodes = layout.nodes.filter((node) => visibleNodeIds.has(node.id));
  const visibleNodeIdSet = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = layout.edges.filter((edge) => visibleNodeIdSet.has(edge.source) && visibleNodeIdSet.has(edge.target));

  const zoomBy = (factor: number) => {
    setViewBox((current) => {
      const nextWidth = Math.max(420, current.width * factor);
      const nextHeight = Math.max(300, current.height * factor);
      const ratioX = (nextWidth - current.width) / 2;
      const ratioY = (nextHeight - current.height) / 2;
      return {
        x: current.x - ratioX,
        y: current.y - ratioY,
        width: nextWidth,
        height: nextHeight,
      };
    });
  };

  const resetView = () => {
    if (!layout) {
      return;
    }

    setViewBox({
      x: -32,
      y: -20,
      width: Math.max(containerRef.current?.clientWidth ?? 800, layout.width),
      height: Math.max(containerRef.current?.clientHeight ?? 500, layout.height),
    });
  };

  const onWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 1.08 : 0.92;
    setViewBox((current) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const pointerX = rect ? ((event.clientX - rect.left) / rect.width) : 0.5;
      const pointerY = rect ? ((event.clientY - rect.top) / rect.height) : 0.5;
      const nextWidth = Math.max(420, current.width * factor);
      const nextHeight = Math.max(300, current.height * factor);
      const worldX = current.x + pointerX * current.width;
      const worldY = current.y + pointerY * current.height;

      return {
        x: worldX - pointerX * nextWidth,
        y: worldY - pointerY * nextHeight,
        width: nextWidth,
        height: nextHeight,
      };
    });
  };

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      viewX: viewBox.x,
      viewY: viewBox.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState.current) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;
    const dx = (event.clientX - dragState.current.startX) * scaleX;
    const dy = (event.clientY - dragState.current.startY) * scaleY;
    setViewBox((current) => ({
      ...current,
      x: dragState.current!.viewX - dx,
      y: dragState.current!.viewY - dy,
    }));
  };

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    dragState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="ctree-canvas" ref={containerRef}>
      <div className="ctree-canvas__toolbar">
        <button className="ctree-mini-button" type="button" onClick={() => zoomBy(0.86)} aria-label="缩小" title="缩小">
          <span>−</span>
        </button>
        <button className="ctree-mini-button" type="button" onClick={() => zoomBy(1.16)} aria-label="放大" title="放大">
          <span>+</span>
        </button>
        <button className="ctree-mini-button" type="button" onClick={resetView} aria-label="适应视图" title="适应视图">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
            <path d="M8 3H4a1 1 0 0 0-1 1v4M16 3h4a1 1 0 0 1 1 1v4M8 21H4a1 1 0 0 1-1-1v-4M16 21h4a1 1 0 0 0 1-1v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <svg
        className="ctree-svg"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="tree"
      >
        <g className="ctree-edges">
          {visibleEdges.map((edge) => {
            const isActive = activeSet.has(edge.source) && activeSet.has(edge.target);
            return <path key={`${edge.source}:${edge.target}`} d={edge.path} className={isActive ? 'is-active' : ''} />;
          })}
        </g>
        <g className="ctree-nodes">
          {visibleNodes.map((layoutNode) => {
            const node = layoutNode.node;
            const selected = node.id === selectedNodeId;
            const active = node.active;
            const accent = nodeAccent(node);
            const label = roleLabel(node);
            const content = node.content.replace(/\s+/g, ' ').trim();

            return (
              <g
                key={node.id}
                transform={`translate(${layoutNode.x} ${layoutNode.y})`}
                className={selected ? 'ctree-node is-selected' : active ? 'ctree-node is-active' : 'ctree-node'}
                onClick={() => setSelectedNodeId(node.id)}
                role="treeitem"
                tabIndex={0}
                aria-selected={selected}
              >
                <rect width={layoutNode.width} height={layoutNode.height} rx="9" style={{ '--node-accent': accent } as React.CSSProperties} />
                <rect className="ctree-node__accent" x="0" y="0" width="3" height={layoutNode.height} rx="1.5" fill={accent} />
                <text className="ctree-node__role" x="14" y="20">{label}</text>
                <text className="ctree-node__title" x="14" y="38">{truncate(node.title || content, 24)}</text>
                <text className="ctree-node__content" x="14" y="55">{truncate(content, 34)}</text>
                {node.versionLabel ? (
                  <g transform={`translate(${layoutNode.width - 38} 12)`}>
                    <rect width="26" height="17" rx="5" className="ctree-node__version" />
                    <text x="13" y="12" textAnchor="middle" className="ctree-node__version-text">{node.versionLabel}</text>
                  </g>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
