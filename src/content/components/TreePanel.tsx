import { useMemo } from 'react';
import { useConversationTreeStore } from '../store';
import { MessageTypes } from '../../shared/messages';
import { NodeDetail } from './NodeDetail';
import { TreeCanvas } from './TreeCanvas';

export function TreePanel() {
  const graph = useConversationTreeStore((state) => state.graph);
  const selectedNodeId = useConversationTreeStore((state) => state.selectedNodeId);
  const searchQuery = useConversationTreeStore((state) => state.searchQuery);
  const isRefreshing = useConversationTreeStore((state) => state.isRefreshing);
  const setSearchQuery = useConversationTreeStore((state) => state.setSearchQuery);
  const setPanelOpen = useConversationTreeStore((state) => state.setPanelOpen);
  const setSelectedNodeId = useConversationTreeStore((state) => state.setSelectedNodeId);
  const setIsRefreshing = useConversationTreeStore((state) => state.setIsRefreshing);

  const activeCount = graph?.activePath.length ?? 0;
  const versionCount = useMemo(() => {
    if (!graph) {
      return 0;
    }

    const groups = new Set(Object.values(graph.nodes).map((node) => node.versionGroupId).filter(Boolean));
    return groups.size;
  }, [graph]);

  const refresh = () => {
    setIsRefreshing(true);
    void chrome.runtime.sendMessage({ type: MessageTypes.FetchConversation }).catch(() => undefined);
    window.setTimeout(() => setIsRefreshing(false), 1200);
  };

  const clearSelection = () => setSelectedNodeId(null);

  return (
    <aside className="ctree-panel" aria-label="ChatGPT 对话树">
      <header className="ctree-panel__header">
        <div className="ctree-panel__brand">
          <span className="ctree-panel__brand-mark">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
              <circle cx="12" cy="5" r="2.3" fill="currentColor" />
              <circle cx="5" cy="18" r="2.3" fill="currentColor" />
              <circle cx="19" cy="18" r="2.3" fill="currentColor" />
              <path d="M12 7.5v3.8M12 7.5 6.7 15.6M12 7.5l5.3 8.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <h1>Conversation Tree</h1>
            <p>{graph?.title ?? '等待对话数据'}</p>
          </div>
        </div>
        <div className="ctree-panel__actions">
          <button className="ctree-icon-button" type="button" onClick={refresh} disabled={isRefreshing} aria-label="刷新" title="刷新">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
              <path d="M19 8a7.5 7.5 0 1 0 1 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M19 3v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="ctree-icon-button" type="button" onClick={() => setPanelOpen(false)} aria-label="关闭" title="关闭">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <section className="ctree-panel__metrics">
        <div className="ctree-metric">
          <strong>{graph ? Object.keys(graph.nodes).length : 0}</strong>
          <span>节点</span>
        </div>
        <div className="ctree-metric">
          <strong>{activeCount}</strong>
          <span>活跃路径</span>
        </div>
        <div className="ctree-metric">
          <strong>{versionCount}</strong>
          <span>版本组</span>
        </div>
      </section>

      <div className="ctree-search">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="搜索节点"
          aria-label="搜索节点"
        />
        {searchQuery ? (
          <button className="ctree-search__clear" type="button" onClick={() => setSearchQuery('')} aria-label="清除搜索">×</button>
        ) : null}
      </div>

      <div className="ctree-panel__body">
        {graph ? (
          <>
            <div className="ctree-canvas-wrap">
              <TreeCanvas />
            </div>
            {selectedNodeId ? (
              <NodeDetail nodeId={selectedNodeId} onClose={clearSelection} />
            ) : (
              <div className="ctree-empty-hint">
                <span>选择一个节点查看完整内容</span>
                <small>点击树中任意消息节点</small>
              </div>
            )}
          </>
        ) : (
          <div className="ctree-empty-state">
            <div className="ctree-empty-state__icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
                <path d="M4 5.5h6a5.5 5.5 0 0 1 5.5 5.5v8M4 5.5h7a3.5 3.5 0 0 1 3.5 3.5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="18" cy="5" r="2" fill="currentColor" />
                <circle cx="5" cy="18" r="2" fill="currentColor" />
              </svg>
            </div>
            <strong>尚未捕获到对话</strong>
            <span>打开或刷新一个 ChatGPT 对话后，插件会自动解析完整分支树。</span>
            <button className="ctree-primary-button" type="button" onClick={refresh}>立即刷新</button>
          </div>
        )}
      </div>
    </aside>
  );
}
