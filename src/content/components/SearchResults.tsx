import { useMemo } from 'react';
import { selectAndNavigate } from '../navigation';
import { useConversationTreeStore } from '../store';
import type { MessageNode } from '../../shared/types';

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

function snippet(node: MessageNode): string {
  return (node.plainContent || node.content).slice(0, 80);
}

export function SearchResults() {
  const graph = useConversationTreeStore((state) => state.graph);
  const searchQuery = useConversationTreeStore((state) => state.searchQuery);

  const results = useMemo(() => {
    if (!graph || !searchQuery.trim()) {
      return [];
    }

    const query = searchQuery.trim().toLowerCase();
    return Object.values(graph.nodes)
      .filter((node) => `${node.title} ${node.content}`.toLowerCase().includes(query))
      .slice(0, 12);
  }, [graph, searchQuery]);

  if (!searchQuery.trim()) {
    return null;
  }

  return (
    <div className="ctree-results" aria-label="搜索结果">
      <div className="ctree-results__header">
        <span>{results.length ? `${results.length} 个匹配` : '没有匹配节点'}</span>
      </div>
      {results.length ? (
        <div className="ctree-results__list">
          {results.map((node) => (
            <button
              className="ctree-result"
              type="button"
              key={node.id}
              onClick={() => void selectAndNavigate(node.id)}
            >
              <span className={`ctree-result__dot is-${node.role}`} />
              <span className="ctree-result__body">
                <span className="ctree-result__title">
                  <b>{roleLabel(node)}</b>
                  {node.versionLabel ? <em>{node.versionLabel}</em> : null}
                </span>
                <span className="ctree-result__text">{snippet(node)}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
