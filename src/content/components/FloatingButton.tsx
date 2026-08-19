import { useConversationTreeStore } from '../store';

export function FloatingButton() {
  const panelOpen = useConversationTreeStore((state) => state.panelOpen);
  const togglePanel = useConversationTreeStore((state) => state.togglePanel);
  const graph = useConversationTreeStore((state) => state.graph);

  return (
    <button
      className={panelOpen ? 'ctree-float is-active' : 'ctree-float'}
      type="button"
      aria-label={panelOpen ? '收起对话树' : '打开对话树'}
      title={panelOpen ? '收起对话树' : '打开对话树'}
      onClick={togglePanel}
    >
      <span className="ctree-float__mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <circle cx="12" cy="5" r="2.5" fill="currentColor" />
          <circle cx="5" cy="18" r="2.5" fill="currentColor" />
          <circle cx="19" cy="18" r="2.5" fill="currentColor" />
          <path d="M12 7.5v4.2M12 7.5 6.4 15.7M12 7.5l5.6 8.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      {!panelOpen && graph ? <span className="ctree-float__count">{Object.keys(graph.nodes).length}</span> : null}
    </button>
  );
}
