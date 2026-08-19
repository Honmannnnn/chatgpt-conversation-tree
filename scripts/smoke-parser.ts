import { parseConversationApiResponse } from '../src/shared/api';

const sample = {
  title: 'Smoke',
  conversation_id: 'smoke-conversation',
  current_node: 'a2',
  mapping: {
    root: {
      id: 'root',
      parent: null,
      children: ['u1'],
    },
    u1: {
      id: 'u1',
      parent: 'root',
      children: ['a1', 'a2'],
      message: {
        id: 'mu1',
        author: { role: 'user' },
        create_time: 1,
        content: { content_type: 'text', parts: ['hello'] },
        metadata: {},
      },
    },
    a1: {
      id: 'a1',
      parent: 'u1',
      children: [],
      message: {
        id: 'ma1',
        author: { role: 'assistant' },
        create_time: 2,
        content: { content_type: 'text', parts: ['first'] },
        metadata: { model_slug: 'gpt-4o' },
      },
    },
    a2: {
      id: 'a2',
      parent: 'u1',
      children: [],
      message: {
        id: 'ma2',
        author: { role: 'assistant' },
        create_time: 3,
        content: { content_type: 'text', parts: ['second'] },
        metadata: { model_slug: 'gpt-4o' },
      },
    },
  },
};

const graph = parseConversationApiResponse(sample);

if (!graph) {
  throw new Error('Parser returned null.');
}

if (Object.keys(graph.nodes).length !== 3) {
  throw new Error(`Expected 3 nodes, got ${Object.keys(graph.nodes).length}.`);
}

if (graph.nodes.a1.versionLabel !== '1/2' || graph.nodes.a2.versionLabel !== '2/2') {
  throw new Error('Version labels were not assigned correctly.');
}

if (!graph.activePath.includes('a2') || !graph.activePath.includes('u1')) {
  throw new Error('Active path was not built correctly.');
}

console.log('Smoke parser passed.', {
  nodeCount: Object.keys(graph.nodes).length,
  activePath: graph.activePath,
  versionGroup: graph.nodes.a1.versionGroupId,
});
