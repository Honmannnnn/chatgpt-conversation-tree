import { useConversationTreeStore } from '../store';

interface NodeDetailProps {
  nodeId: string;
  onClose: () => void;
}

function roleText(role: string): string {
  if (role === 'assistant') {
    return '模型回复';
  }

  if (role === 'tool') {
    return '工具调用';
  }

  if (role === 'system') {
    return '系统消息';
  }

  return '用户提问';
}

export function NodeDetail({ nodeId, onClose }: NodeDetailProps) {
  const graph = useConversationTreeStore((state) => state.graph);
  const setSelectedNodeId = useConversationTreeStore((state) => state.setSelectedNodeId);
  const node = graph?.nodes[nodeId];

  if (!graph || !node) {
    return null;
  }

  const parent = node.parentId ? graph.nodes[node.parentId] : null;
  const children = node.children.map((childId) => graph.nodes[childId]).filter(Boolean);

  const jumpToParent = () => {
    if (parent) {
      setSelectedNodeId(parent.id);
    }
  };

  const jumpToChild = (childId: string) => {
    setSelectedNodeId(childId);
  };

  return (
    <section className="ctree-detail">
      <div className="ctree-detail__header">
        <div>
          <span className={`ctree-detail__role is-${node.role}`}>{roleText(node.role)}</span>
          <h2>{node.title}</h2>
        </div>
        <button className="ctree-icon-button" type="button" onClick={onClose} aria-label="关闭详情" title="关闭详情">×</button>
      </div>

      <div className="ctree-detail__meta">
        <span>{node.versionLabel ? `版本 ${node.versionLabel}` : '单版本'}</span>
        <span>{node.children.length} 个子分支</span>
        {node.modelSlug ? <span>{node.modelSlug}</span> : null}
      </div>

      <div className="ctree-detail__content">
        {node.content || '暂无文本内容'}
      </div>

      <div className="ctree-detail__relations">
        {parent ? (
          <button className="ctree-relation-button" type="button" onClick={jumpToParent}>
            <span>父节点</span>
            <strong>{parent.title}</strong>
          </button>
        ) : <span className="ctree-relation-empty">根节点</span>}

        {children.length ? (
          <div className="ctree-detail__children">
            <span>子分支</span>
            {children.map((child) => (
              <button className="ctree-relation-button" type="button" key={child.id} onClick={() => jumpToChild(child.id)}>
                <strong>{child.title}</strong>
                <small>{child.versionLabel ? `版本 ${child.versionLabel}` : '分支'}</small>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
