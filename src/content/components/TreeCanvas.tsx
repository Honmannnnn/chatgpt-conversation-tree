import { useEffect, useMemo, useRef, useState } from 'react';
import { buildTreeLayout } from '../../core/layout';
import { useConversationTreeStore } from '../store';
import { selectAndNavigate } from '../navigation';
import type { MessageNode } from '../../shared/types';

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function measureTextWidth(value: string, fontSize: number): number {
  let width = 0;

  for (const character of Array.from(value)) {
    const codePoint = character.codePointAt(0) ?? 0;
    const isWide = codePoint > 127;
    width += isWide ? fontSize : fontSize * 0.56;
  }

  return width;
}

function truncateToWidth(value: string, maxWidth: number, fontSize: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (measureTextWidth(clean, fontSize) <= maxWidth) {
    return clean;
  }

  let result = '';
  for (const character of Array.from(clean)) {
    const next = `${result}${character}…`;
    if (measureTextWidth(next, fontSize) > maxWidth) {
      break;
    }
    result += character;
  }

  return `${result}…`;
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
  const roleFilter = useConversationTreeStore((state) => state.roleFilter);
  const activeOnly = useConversationTreeStore((state) => state.activeOnly);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
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

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !layout) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 1.12 : 0.9;
      setViewBox((current) => {
        const rect = containerRef.current?.getBoundingClientRect();
        const rectWidth = rect?.width ?? 800;
        const rectHeight = rect?.height ?? 500;
        const pointerX = rect ? ((event.clientX - rect.left) / rect.width) : 0.5;
        const pointerY = rect ? ((event.clientY - rect.top) / rect.height) : 0.5;
        const minWidth = 160;
        const minHeight = 120;
        const maxWidth = Math.max(layout.width * 3, rectWidth * 5);
        const maxHeight = Math.max(layout.height * 3, rectHeight * 5);
        const nextWidth = Math.min(maxWidth, Math.max(minWidth, current.width * factor));
        const nextHeight = Math.min(maxHeight, Math.max(minHeight, current.height * factor));
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

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [layout]);

  if (!graph || !layout) {
    return null;
  }

  const activeSet = new Set(graph.activePath);
  const query = searchQuery.trim().toLowerCase();

  const visibleNodeIds = new Set<string>();

  for (const node of layout.nodes) {
    const matchesQuery = !query || (node.node.searchText ?? `${node.node.title} ${node.node.plainContent}`).includes(query);
    const matchesRole = roleFilter === 'all' || node.node.role === roleFilter;
    const matchesActive = !activeOnly || node.node.active;

    if (matchesQuery && matchesRole && matchesActive) {
      visibleNodeIds.add(node.id);
      let cursor = node.node.parentId;
      while (cursor && graph.nodes[cursor]) {
        visibleNodeIds.add(cursor);
        cursor = graph.nodes[cursor].parentId;
      }
    }
  }

  const visibleNodes = layout.nodes.filter((node) => visibleNodeIds.has(node.id));
  const visibleNodeIdSet = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = layout.edges.filter((edge) => visibleNodeIdSet.has(edge.source) && visibleNodeIdSet.has(edge.target));

  const zoomBy = (factor: number) => {
    setViewBox((current) => {
      const containerWidth = containerRef.current?.clientWidth ?? 800;
      const containerHeight = containerRef.current?.clientHeight ?? 500;
      const minWidth = 160;
      const minHeight = 120;
      const maxWidth = Math.max(layout?.width ? layout.width * 3 : 3600, containerWidth * 5);
      const maxHeight = Math.max(layout?.height ? layout.height * 3 : 1440, containerHeight * 5);
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, current.width * factor));
      const nextHeight = Math.min(maxHeight, Math.max(minHeight, current.height * factor));
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
    const drag = dragState.current;
    if (!drag) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;
    const dx = (event.clientX - drag.startX) * scaleX;
    const dy = (event.clientY - drag.startY) * scaleY;
    setViewBox((current) => ({
      ...current,
      x: drag.viewX - dx,
      y: drag.viewY - dy,
    }));
  };

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    dragState.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
  };

  return (
    <div className="ctree-canvas" ref={containerRef}>
      <div className="ctree-canvas__toolbar">
        <button className="ctree-mini-button" type="button" onClick={() => zoomBy(1.16)} aria-label="缩小" title="缩小">
          <span>−</span>
        </button>
        <button className="ctree-mini-button" type="button" onClick={() => zoomBy(0.86)} aria-label="放大" title="放大">
          <span>+</span>
        </button>
        <button className="ctree-mini-button" type="button" onClick={resetView} aria-label="适应视图" title="适应视图">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
            <path d="M8 3H4a1 1 0 0 0-1 1v4M16 3h4a1 1 0 0 1 1 1v4M8 21H4a1 1 0 0 1-1-1v-4M16 21h4a1 1 0 0 0 1-1v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <svg
        ref={svgRef}
        className="ctree-svg"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
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
            const content = node.plainContent || node.content;
            const title = node.title || content;

            return (
              <g
                key={node.id}
                transform={`translate(${layoutNode.x} ${layoutNode.y})`}
                className={selected ? 'ctree-node is-selected' : active ? 'ctree-node is-active' : 'ctree-node'}
                onClick={() => void selectAndNavigate(node.id)}
                role="treeitem"
                tabIndex={0}
                aria-selected={selected}
              >
                <rect width={layoutNode.width} height={layoutNode.height} rx="9" style={{ '--node-accent': accent } as React.CSSProperties} />
                <rect className="ctree-node__accent" x="0" y="0" width="3" height={layoutNode.height} rx="1.5" fill={accent} />
                <text className="ctree-node__role" x="14" y="20">{label}</text>
                <text className="ctree-node__title" x="14" y="38">{truncateToWidth(title, layoutNode.width - 28, 12)}</text>
                <text className="ctree-node__content" x="14" y="55">{truncateToWidth(content, layoutNode.width - 28, 10)}</text>
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
