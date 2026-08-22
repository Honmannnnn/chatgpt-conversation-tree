import { useMemo, useEffect, useRef } from 'react';
import { useConversationTreeStore } from '../store';
import { computeGitGraphLayout, BRANCH_COLORS } from '../../core/gitGraphLayout';
import { selectAndNavigate } from '../navigation';

const ROLE_LABELS: Record<string, string> = {
  user: '提问',
  assistant: '回复',
  tool: '工具',
  system: '系统',
};

export function GitGraphView() {
  const graph = useConversationTreeStore((state) => state.graph);
  const selectedNodeId = useConversationTreeStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useConversationTreeStore((state) => state.setSelectedNodeId);
  const roleFilter = useConversationTreeStore((state) => state.roleFilter);
  const activeOnly = useConversationTreeStore((state) => state.activeOnly);
  const searchQuery = useConversationTreeStore((state) => state.searchQuery);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeNodeRef = useRef<HTMLDivElement>(null);

  const ROW_HEIGHT = 74;
  const LANE_WIDTH = 16;

  const layout = useMemo(() => {
    if (!graph) return null;
    return computeGitGraphLayout(graph, ROW_HEIGHT, LANE_WIDTH);
  }, [graph]);

  // Filter rows based on search, role, and active-only filters
  const filteredRows = useMemo(() => {
    if (!layout) return [];
    const query = searchQuery.trim().toLowerCase();

    return layout.rows.filter((row) => {
      if (roleFilter !== 'all' && row.node.role !== roleFilter) {
        return false;
      }
      if (activeOnly && !row.isActive) {
        return false;
      }
      if (query && row.node.searchText && !row.node.searchText.includes(query)) {
        return false;
      }
      return true;
    });
  }, [layout, roleFilter, activeOnly, searchQuery]);

  // Auto-scroll to active node on first load
  useEffect(() => {
    if (activeNodeRef.current && containerRef.current) {
      activeNodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [graph?.currentLeafId]);

  if (!graph || !layout || layout.rows.length === 0) {
    return null;
  }

  const { railsWidth } = layout;

  return (
    <div className="ctree-git-graph" ref={containerRef}>
      <div
        className="ctree-git-graph__inner"
        style={{
          minHeight: `${layout.totalHeight}px`,
          minWidth: `${Math.max(360, railsWidth + 240)}px`,
        }}
      >
        {/* SVG Git Rails & Curves */}
        <svg
          className="ctree-git-rails"
          style={{
            width: `${railsWidth}px`,
            height: `${layout.totalHeight}px`,
          }}
          aria-hidden="true"
        >
          {/* Segments (Connecting Lines) */}
          {layout.segments.map((seg) => (
            <path
              key={seg.id}
              d={seg.path}
              stroke={seg.color}
              strokeWidth={seg.isActive ? 2.4 : 1.5}
              strokeOpacity={seg.isActive ? 1 : 0.45}
              fill="none"
              strokeLinecap="round"
              className={seg.isActive ? 'is-active' : ''}
            />
          ))}

          {/* Commit-style Dots on Rails */}
          {layout.rows.map((row) => {
            const isSelected = selectedNodeId === row.id;

            return (
              <g
                key={row.id}
                className={`ctree-git-dot ${row.isActive ? 'is-active' : ''} ${isSelected ? 'is-selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  void selectAndNavigate(row.id);
                }}
              >
                {/* Outer Ring for Active / Selected */}
                {row.isActive || isSelected ? (
                  <circle
                    cx={row.cx}
                    cy={row.cy}
                    r={isSelected ? 7.5 : 6.5}
                    fill="none"
                    stroke={row.color}
                    strokeWidth={isSelected ? 2.2 : 1.6}
                    strokeOpacity={0.85}
                  />
                ) : null}

                {/* Core Dot */}
                <circle
                  cx={row.cx}
                  cy={row.cy}
                  r={row.isMainline ? 4.5 : 3.8}
                  fill={row.isActive ? row.color : 'var(--ctree-surface)'}
                  stroke={row.color}
                  strokeWidth={1.8}
                />
              </g>
            );
          })}
        </svg>

        {/* Message Cards List */}
        <div
          className="ctree-git-cards"
          style={{ marginLeft: `${railsWidth + 6}px` }}
        >
          {layout.rows.map((row) => {
            const isSelected = selectedNodeId === row.id;
            const isFilteredOut = !filteredRows.some((fr) => fr.id === row.id);

            return (
              <div
                key={row.id}
                ref={row.id === graph.currentLeafId ? activeNodeRef : null}
                className={`ctree-git-card ${row.isActive ? 'is-active' : ''} ${isSelected ? 'is-selected' : ''} ${isFilteredOut ? 'is-muted' : ''}`}
                style={{
                  top: `${row.row * ROW_HEIGHT + 4}px`,
                  height: `${ROW_HEIGHT - 8}px`,
                  borderColor: isSelected
                    ? 'var(--ctree-accent)'
                    : row.isActive
                      ? colorMix(row.color, 45)
                      : undefined,
                }}
                onClick={() => void selectAndNavigate(row.id)}
              >
                {/* Left Colored Accent Stripe matching Git Branch Color */}
                <div
                  className="ctree-git-card__stripe"
                  style={{ backgroundColor: row.color }}
                />

                <div className="ctree-git-card__header">
                  <span
                    className="ctree-git-card__role"
                    style={{ color: row.color }}
                  >
                    {ROLE_LABELS[row.node.role] ?? row.node.role}
                  </span>

                  {row.lane > 0 ? (
                    <span
                      className="ctree-git-card__branch-tag"
                      style={{
                        color: row.color,
                        borderColor: row.color,
                        backgroundColor: colorMix(row.color, 12),
                      }}
                    >
                      分支 #{row.lane}
                    </span>
                  ) : (
                    <span className="ctree-git-card__main-tag">主线</span>
                  )}

                  {row.node.versionLabel ? (
                    <span className="ctree-git-card__version" title={row.node.role === 'assistant' ? 'A/B 对比回复版本' : '编辑版本'}>
                      {row.node.role === 'assistant' ? `对比 ${row.node.versionLabel}` : `版本 ${row.node.versionLabel}`}
                    </span>
                  ) : null}

                  {row.hasBranches ? (
                    <span className="ctree-git-card__fork-count">
                      + {row.branchCount} 分叉
                    </span>
                  ) : null}
                </div>

                <div className="ctree-git-card__title">
                  {row.node.title || '（空白标题）'}
                </div>

                <div className="ctree-git-card__snippet">
                  {row.node.plainContent || row.node.content || ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function colorMix(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
