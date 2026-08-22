import { useEffect, useMemo, useState, useRef } from 'react';
import { useConversationTreeStore } from '../store';
import { MessageTypes } from '../../shared/messages';
import { NodeDetail } from './NodeDetail';
import { SearchResults } from './SearchResults';
import { GitGraphView } from './GitGraphView';
import { downloadJson, downloadMarkdown, downloadSvg } from '../../shared/exporters';
import { LogoMark } from '../../shared/LogoMark';
import type { MessageRole } from '../../shared/types';

export function TreePanel() {
  const graph = useConversationTreeStore((state) => state.graph);
  const selectedNodeId = useConversationTreeStore((state) => state.selectedNodeId);
  const searchQuery = useConversationTreeStore((state) => state.searchQuery);
  const isRefreshing = useConversationTreeStore((state) => state.isRefreshing);
  const notice = useConversationTreeStore((state) => state.notice);
  const roleFilter = useConversationTreeStore((state) => state.roleFilter);
  const activeOnly = useConversationTreeStore((state) => state.activeOnly);
  const setSearchQuery = useConversationTreeStore((state) => state.setSearchQuery);
  const setPanelOpen = useConversationTreeStore((state) => state.setPanelOpen);
  const setSelectedNodeId = useConversationTreeStore((state) => state.setSelectedNodeId);
  const setIsRefreshing = useConversationTreeStore((state) => state.setIsRefreshing);
  const setNotice = useConversationTreeStore((state) => state.setNotice);
  const setRoleFilter = useConversationTreeStore((state) => state.setRoleFilter);
  const setActiveOnly = useConversationTreeStore((state) => state.setActiveOnly);

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice, setNotice]);

  // Close export menu on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    if (exportMenuOpen) {
      window.addEventListener('mousedown', handleOutside);
    }
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [exportMenuOpen]);

  const activeCount = graph?.activePath.length ?? 0;
  const totalNodesCount = graph ? Object.keys(graph.nodes).length : 0;
  const branchCount = useMemo(() => {
    if (!graph) return 0;
    let count = 0;
    for (const node of Object.values(graph.nodes)) {
      if ((node.children?.length ?? 0) > 1) {
        count += node.children.length - 1;
      }
    }
    return count;
  }, [graph]);

  const refresh = () => {
    setIsRefreshing(true);
    void chrome.runtime.sendMessage({ type: MessageTypes.FetchConversation }).catch(() => undefined);
    window.setTimeout(() => setIsRefreshing(false), 1200);
  };

  const clearSelection = () => setSelectedNodeId(null);

  const handleExport = (kind: 'json' | 'markdown' | 'svg') => {
    setExportMenuOpen(false);
    if (!graph) {
      setNotice('暂无可导出的对话数据');
      return;
    }

    if (kind === 'json') {
      downloadJson(graph);
      setNotice('已导出 JSON');
    } else if (kind === 'markdown') {
      downloadMarkdown(graph);
      setNotice('已导出 Markdown');
    } else if (kind === 'svg') {
      downloadSvg(graph);
      setNotice('已导出 SVG');
    }
  };

  const roleTabs: Array<{ key: MessageRole | 'all'; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'user', label: '提问' },
    { key: 'assistant', label: '回复' },
    { key: 'tool', label: '工具' },
  ];

  return (
    <aside className="ctree-panel" aria-label="ChatGPT 对话分支树">
      {/* 1. Header with Clean Brand & Actions */}
      <header className="ctree-panel__header">
        <div className="ctree-panel__brand">
          <span className="ctree-panel__brand-mark">
            <LogoMark size={28} />
          </span>
          <div className="ctree-panel__brand-info">
            <div className="ctree-panel__title-row">
              <h1>Conversation Tree</h1>
              {graph ? (
                <span className="ctree-status-badge">
                  {totalNodesCount} 节点 · {branchCount > 0 ? `${branchCount} 分支` : '单主线'}
                </span>
              ) : null}
            </div>
            <p>{graph?.title || '等待对话数据...'}</p>
          </div>
        </div>

        <div className="ctree-panel__actions">
          {/* Export Menu Popover */}
          <div className="ctree-export-menu-wrapper" ref={exportMenuRef}>
            <button
              className="ctree-icon-button"
              type="button"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              title="导出对话"
              aria-label="导出对话"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                <path d="M12 3v12M12 15l-4-4M12 15l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {exportMenuOpen ? (
              <div className="ctree-export-popover">
                <div className="ctree-export-popover__title">导出对话图谱</div>
                <button type="button" onClick={() => handleExport('markdown')}>
                  <span className="ctree-export-icon">MD</span>
                  <span>Markdown 文档</span>
                </button>
                <button type="button" onClick={() => handleExport('json')}>
                  <span className="ctree-export-icon">{}</span>
                  <span>JSON 结构数据</span>
                </button>
                <button type="button" onClick={() => handleExport('svg')}>
                  <span className="ctree-export-icon">SVG</span>
                  <span>SVG 矢量图</span>
                </button>
              </div>
            ) : null}
          </div>

          <button
            className="ctree-icon-button"
            type="button"
            onClick={refresh}
            disabled={isRefreshing}
            aria-label="刷新"
            title="刷新对话"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" className={isRefreshing ? 'is-spinning' : ''}>
              <path d="M19 8a7.5 7.5 0 1 0 1 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M19 3v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            className="ctree-icon-button"
            type="button"
            onClick={() => setPanelOpen(false)}
            aria-label="关闭"
            title="关闭面板"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* 2. Forked Chat Banner if applicable */}
      {graph?.isForked ? (
        <div className="ctree-fork-alert">
          <div className="ctree-fork-alert__badge">🔀 分支子对话</div>
          <p className="ctree-fork-alert__text">
            当前是从历史消息分叉的独立子对话，已自动聚合主线与兄弟分支。
          </p>
          {graph.parentConversationId ? (
            <button
              className="ctree-fork-alert__button"
              type="button"
              onClick={() => {
                window.location.href = `/c/${graph.parentConversationId}`;
              }}
            >
              返回主线 →
            </button>
          ) : null}
        </div>
      ) : null}

      {/* 3. Modern Search & Filter Controls */}
      <div className="ctree-controls">
        <div className="ctree-search-box">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
            <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索对话节点内容..."
            aria-label="搜索节点"
          />
          {searchQuery ? (
            <button className="ctree-search-box__clear" type="button" onClick={() => setSearchQuery('')} aria-label="清除搜索">×</button>
          ) : null}
        </div>

        <div className="ctree-filter-bar">
          {/* Segmented Role Chips */}
          <div className="ctree-chip-group">
            {roleTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`ctree-chip ${roleFilter === tab.key ? 'is-active' : ''}`}
                onClick={() => setRoleFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Mainline Toggle */}
          <button
            type="button"
            className={`ctree-mainline-toggle ${activeOnly ? 'is-active' : ''}`}
            onClick={() => setActiveOnly(!activeOnly)}
            title="仅查看当前活跃路径"
          >
            <span className="ctree-mainline-toggle__dot" />
            <span>仅活跃主线</span>
          </button>
        </div>
      </div>

      <SearchResults />

      {/* 4. Main Body: Pure Git Branch View */}
      <div className="ctree-panel__body">
        {graph ? (
          <>
            <div className="ctree-git-container">
              <GitGraphView />
            </div>
            {selectedNodeId ? (
              <NodeDetail nodeId={selectedNodeId} onClose={clearSelection} />
            ) : (
              <div className="ctree-empty-hint">
                <span>点击任意节点卡片查看完整消息内容</span>
              </div>
            )}
          </>
        ) : (
          <div className="ctree-empty-state">
            <div className="ctree-empty-state__icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <strong>等待捕获对话</strong>
            <span>在 ChatGPT 中打开任意对话，插件会自动生成 Git 分支树。</span>
            <button className="ctree-primary-button" type="button" onClick={refresh}>立即刷新</button>
          </div>
        )}
      </div>

      {notice ? <div className="ctree-toast" role="status">{notice}</div> : null}
    </aside>
  );
}
