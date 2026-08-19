import { createRoot } from 'react-dom/client';
import { TreePanel } from '../content/components/TreePanel';
import { useConversationTreeStore } from '../content/store';
import { parseConversationApiResponse } from '../shared/api';
import './demo.css';

const sampleResponse = {
  title: '如何设计一个可靠的分支系统',
  conversation_id: 'demo-conversation',
  current_node: 'assistant-a2',
  mapping: {
    root: {
      id: 'root',
      parent: null,
      children: ['user-1'],
    },
    'user-1': {
      id: 'user-1',
      parent: 'root',
      children: ['assistant-a1', 'assistant-a2', 'assistant-a3'],
      message: {
        id: 'msg-user-1',
        author: { role: 'user' },
        create_time: 1,
        content: { content_type: 'text', parts: ['我想把 ChatGPT 的对话分支可视化，应该从哪里开始？'] },
        metadata: {},
      },
    },
    'assistant-a1': {
      id: 'assistant-a1',
      parent: 'user-1',
      children: ['user-2-a'],
      message: {
        id: 'msg-a1',
        author: { role: 'assistant' },
        create_time: 2,
        content: { content_type: 'text', parts: ['先从数据模型开始，把每个消息节点和 parent/child 关系固定下来。'] },
        metadata: { model_slug: 'gpt-4o' },
      },
    },
    'assistant-a2': {
      id: 'assistant-a2',
      parent: 'user-1',
      children: ['user-2-b'],
      message: {
        id: 'msg-a2',
        author: { role: 'assistant' },
        create_time: 3,
        content: { content_type: 'text', parts: ['另一个更稳妥的思路是直接拦截 ChatGPT 的 conversation API，再解析 mapping。'] },
        metadata: { model_slug: 'gpt-4o' },
      },
    },
    'assistant-a3': {
      id: 'assistant-a3',
      parent: 'user-1',
      children: ['user-2-c'],
      message: {
        id: 'msg-a3',
        author: { role: 'assistant' },
        create_time: 4,
        content: { content_type: 'text', parts: ['如果只抓 DOM，会在分支切换时丢失隐藏版本，因此 API 捕获是更完整的来源。'] },
        metadata: { model_slug: 'gpt-4o' },
      },
    },
    'user-2-a': {
      id: 'user-2-a',
      parent: 'assistant-a1',
      children: [],
      message: {
        id: 'msg-user-2-a',
        author: { role: 'user' },
        create_time: 5,
        content: { content_type: 'text', parts: ['那版本分支和编辑分支是不是同一种东西？'] },
        metadata: {},
      },
    },
    'user-2-b': {
      id: 'user-2-b',
      parent: 'assistant-a2',
      children: [],
      message: {
        id: 'msg-user-2-b',
        author: { role: 'user' },
        create_time: 6,
        content: { content_type: 'text', parts: ['插件如何知道当前活跃的是哪条分支？'] },
        metadata: {},
      },
    },
    'user-2-c': {
      id: 'user-2-c',
      parent: 'assistant-a3',
      children: [],
      message: {
        id: 'msg-user-2-c',
        author: { role: 'user' },
        create_time: 7,
        content: { content_type: 'text', parts: ['如果页面刷新，如何恢复之前捕获的树？'] },
        metadata: {},
      },
    },
  },
};

const graph = parseConversationApiResponse(sampleResponse);

if (graph) {
  useConversationTreeStore.getState().setGraph(graph);
  useConversationTreeStore.getState().setPanelOpen(true);
  useConversationTreeStore.getState().setSelectedNodeId('assistant-a2');
}

createRoot(document.getElementById('root')!).render(<TreePanel />);
