import { navigateToNode } from '../core/domNavigator';
import { useConversationTreeStore } from './store';

export async function selectAndNavigate(nodeId: string): Promise<void> {
  const graph = useConversationTreeStore.getState().graph;
  if (!graph || !graph.nodes[nodeId]) {
    return;
  }

  useConversationTreeStore.getState().setSelectedNodeId(nodeId);
  const result = await navigateToNode(graph, nodeId);

  if (result.found && result.switched) {
    useConversationTreeStore.getState().setNotice('已切换到目标版本并定位');
  } else if (result.found) {
    useConversationTreeStore.getState().setNotice('已定位到消息');
  } else {
    useConversationTreeStore.getState().setNotice('目标消息尚未出现在页面中，可稍后重试或刷新');
  }
}
