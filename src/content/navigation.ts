import { navigateToNode } from '../core/domNavigator';
import { useConversationTreeStore } from './store';

export async function selectAndNavigate(nodeId: string): Promise<void> {
  const graph = useConversationTreeStore.getState().graph;
  if (!graph || !graph.nodes[nodeId]) {
    return;
  }

  useConversationTreeStore.getState().setSelectedNodeId(nodeId);
  void navigateToNode(graph, nodeId);
}
