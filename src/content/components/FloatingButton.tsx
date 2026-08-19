import { useConversationTreeStore } from '../store';
import { LogoMark } from '../../shared/LogoMark';

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
        <LogoMark size={30} />
      </span>
      {!panelOpen && graph ? <span className="ctree-float__count">{Object.keys(graph.nodes).length}</span> : null}
    </button>
  );
}
