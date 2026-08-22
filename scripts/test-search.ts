import { parseConversationApiResponse } from '../src/shared/api';
import type { ConversationGraph } from '../src/shared/types';

function createLargeConversation(nodeCount = 1500): any {
  const mapping: Record<string, any> = {
    root: {
      id: 'root',
      parent: null,
      children: ['u-1'],
    },
  };

  let parentId = 'root';
  for (let i = 1; i <= nodeCount; i++) {
    const isUser = i % 2 === 1;
    const role = isUser ? 'user' : i % 8 === 0 ? 'tool' : i % 20 === 0 ? 'system' : 'assistant';
    const id = `node-${i}`;
    const messageId = `msg-${i}`;
    const isBranch = i % 15 === 0;

    mapping[id] = {
      id,
      parent: parentId,
      children: [],
      message: {
        id: messageId,
        author: { role },
        create_time: i * 1000,
        content: {
          content_type: 'text',
          parts: [
            `Message ${i}: ${role === 'user' ? '用户提问关于算法分支的问题' : '助手回复详细分析与代码示例'} ${isBranch ? '【特殊分支标记】' : ''} keyword-${i % 100}`,
          ],
        },
        metadata: role === 'assistant' ? { model_slug: 'gpt-4o' } : {},
      },
    };

    if (mapping[parentId]) {
      mapping[parentId].children.push(id);
    }

    if (isBranch && i + 2 <= nodeCount) {
      const branchChildId = `branch-sub-${i}`;
      mapping[branchChildId] = {
        id: branchChildId,
        parent: id,
        children: [],
        message: {
          id: `msg-branch-${i}`,
          author: { role: 'assistant' },
          create_time: i * 1000 + 500,
          content: { content_type: 'text', parts: [`这是分支子回复 ${i}，包含特别说明`] },
          metadata: { model_slug: 'gpt-4o' },
        },
      };
      mapping[id].children.push(branchChildId);
    }

    parentId = id;
  }

  return {
    title: '大规模 1500+ 节点测试对话',
    conversation_id: 'large-test-conv-1500',
    current_node: `node-${nodeCount}`,
    mapping,
  };
}

console.log('Generating 1500+ nodes conversation fixture...');
const rawPayload = createLargeConversation(1500);
const startParse = performance.now();
const graph = parseConversationApiResponse(rawPayload) as ConversationGraph;
const parseTime = performance.now() - startParse;

if (!graph) {
  throw new Error('Failed to parse large conversation fixture.');
}

console.log(`Parsed ${Object.keys(graph.nodes).length} nodes in ${parseTime.toFixed(2)}ms.`);

// Test 1: Full-text search with keyword
const startSearch1 = performance.now();
const query = '特殊分支标记';
const results1 = Object.values(graph.nodes).filter((node) =>
  (node.searchText ?? `${node.title} ${node.plainContent}`).includes(query.toLowerCase()),
);
const search1Time = performance.now() - startSearch1;

if (results1.length === 0) {
  throw new Error('Test 1 failed: Expected to find branch marker nodes.');
}
console.log(`Test 1 (Keyword Search) passed: found ${results1.length} matches in ${search1Time.toFixed(2)}ms.`);

// Test 2: Role filter
const userNodes = Object.values(graph.nodes).filter((node) => node.role === 'user');
const assistantNodes = Object.values(graph.nodes).filter((node) => node.role === 'assistant');
const toolNodes = Object.values(graph.nodes).filter((node) => node.role === 'tool');
const systemNodes = Object.values(graph.nodes).filter((node) => node.role === 'system');

if (userNodes.length === 0 || assistantNodes.length === 0 || toolNodes.length === 0 || systemNodes.length === 0) {
  throw new Error('Test 2 failed: Missing nodes for expected roles.');
}
console.log(`Test 2 (Role Filtering) passed: user=${userNodes.length}, assistant=${assistantNodes.length}, tool=${toolNodes.length}, system=${systemNodes.length}.`);

// Test 3: Active-only filter
const activeNodes = Object.values(graph.nodes).filter((node) => node.active);
if (activeNodes.length === 0 || activeNodes.length !== graph.activePath.length) {
  throw new Error(`Test 3 failed: Active node count mismatch. activeNodes=${activeNodes.length}, activePath=${graph.activePath.length}`);
}
console.log(`Test 3 (Active Path Filter) passed: ${activeNodes.length} active nodes along main chain.`);

// Test 4: Search benchmark (100 sequential queries)
const benchStart = performance.now();
for (let q = 0; q < 100; q++) {
  const term = `keyword-${q % 100}`;
  const res = Object.values(graph.nodes).filter((node) =>
    (node.searchText ?? `${node.title} ${node.plainContent}`).includes(term),
  );
  if (res.length === 0) {
    throw new Error(`Benchmark query for "${term}" returned 0 results.`);
  }
}
const benchTotalTime = performance.now() - benchStart;
const avgQueryTime = benchTotalTime / 100;

console.log(`Test 4 (Search Benchmark) passed: 100 queries in ${benchTotalTime.toFixed(2)}ms (average ${avgQueryTime.toFixed(3)}ms per query).`);

if (avgQueryTime > 5.0) {
  throw new Error(`Search performance warning: Average query time (${avgQueryTime.toFixed(3)}ms) exceeded 5ms threshold.`);
}

console.log('\nAll search regression tests and performance benchmarks PASSED successfully!');
