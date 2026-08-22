import { parseConversationApiResponse, extractConversationIdFromUrl } from '../src/shared/api';
import { buildTreeLayout, orthogonalEdgePath } from '../src/core/layout';
import { graphToSvg, graphToMarkdown, graphToJson } from '../src/shared/exporters';
import type { ConversationGraph } from '../src/shared/types';

console.log('=== Running Comprehensive System Self-Test ===\n');

// -------------------------------------------------------------
// Test 1: URL Conversation ID Extraction
// -------------------------------------------------------------
console.log('--- Test 1: URL Parsing ---');
const testUrls = [
  { url: 'https://chatgpt.com/c/67b9319e-53c8-8005-99dc-70c8d76dbf73', expected: '67b9319e-53c8-8005-99dc-70c8d76dbf73' },
  { url: 'https://chatgpt.com/conversation/abc-123_456', expected: 'abc-123_456' },
  { url: 'https://chat.openai.com/c/chat-uuid-test', expected: 'chat-uuid-test' },
  { url: 'https://chatgpt.com/', expected: null },
  { url: 'https://chatgpt.com/g/g-p-12345/c/gpt-custom-conv', expected: 'gpt-custom-conv' },
];

for (const { url, expected } of testUrls) {
  const result = extractConversationIdFromUrl(url);
  if (result !== expected) {
    throw new Error(`URL test failed for "${url}". Expected "${expected}", got "${result}".`);
  }
}
console.log('✓ URL parsing tests passed.\n');

// -------------------------------------------------------------
// Test 2: Forked Conversation & Version Group Metadata
// -------------------------------------------------------------
console.log('--- Test 2: Fork Detection & Version Groups ---');
const forkSample = {
  title: '分支 · 你好问候',
  conversation_id: 'fork-conv-1',
  parent_conversation_id: 'main-conv-root',
  forked_from_message_id: 'msg-root-4',
  current_node: 'node-3',
  mapping: {
    root: { id: 'root', parent: null, children: ['node-1'] },
    'node-1': {
      id: 'node-1',
      parent: 'root',
      children: ['node-2a', 'node-2b'],
      message: { id: 'msg-1', author: { role: 'user' }, create_time: 10, content: { content_type: 'text', parts: ['Hello & World <Test>'] } },
    },
    'node-2a': {
      id: 'node-2a',
      parent: 'node-1',
      children: ['node-3'],
      message: { id: 'msg-2a', author: { role: 'assistant' }, create_time: 20, content: { content_type: 'text', parts: ['Response Version 1'] } },
    },
    'node-2b': {
      id: 'node-2b',
      parent: 'node-1',
      children: [],
      message: { id: 'msg-2b', author: { role: 'assistant' }, create_time: 30, content: { content_type: 'text', parts: ['Response Version 2'] } },
    },
    'node-3': {
      id: 'node-3',
      parent: 'node-2a',
      children: [],
      message: { id: 'msg-3', author: { role: 'user' }, create_time: 40, content: { content_type: 'text', parts: ['Next question'] } },
    },
  },
};

const forkGraph = parseConversationApiResponse(forkSample);
if (!forkGraph) {
  throw new Error('Failed to parse fork sample.');
}
if (!forkGraph.isForked || forkGraph.parentConversationId !== 'main-conv-root') {
  throw new Error('Fork detection failed on parent_conversation_id.');
}
if (forkGraph.nodes['node-2a'].versionLabel !== '1/2' || forkGraph.nodes['node-2b'].versionLabel !== '2/2') {
  throw new Error(`Version labels failed. Got 2a=${forkGraph.nodes['node-2a'].versionLabel}, 2b=${forkGraph.nodes['node-2b'].versionLabel}`);
}
console.log('✓ Fork detection and version groups passed.\n');

// -------------------------------------------------------------
// Test 3: Layout Node Overlap & Coordinate Integrity Check
// -------------------------------------------------------------
console.log('--- Test 3: Layout Node Overlap & Coordinate Checks ---');

function checkNodeOverlaps(graph: ConversationGraph, collapsed: Record<string, boolean> = {}) {
  const layout = buildTreeLayout(graph, collapsed);
  const nodes = layout.nodes;

  // Check no negative dimensions or NaN
  for (const n of nodes) {
    if (isNaN(n.x) || isNaN(n.y) || isNaN(n.width) || isNaN(n.height)) {
      throw new Error(`Node ${n.id} has NaN coordinates: x=${n.x}, y=${n.y}`);
    }
  }

  // Check overlaps between nodes at the same Y level
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];

      // If they are on the same vertical level
      if (Math.abs(a.y - b.y) < 10) {
        const overlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        if (overlap > 0) {
          throw new Error(`Layout overlap detected between ${a.id} (x=${a.x}) and ${b.id} (x=${b.x}) on level y=${a.y}, overlap=${overlap}px`);
        }
      }
    }
  }

  // Check edge syntax
  for (const edge of layout.edges) {
    if (!edge.path.startsWith('M ') || !edge.path.includes('L ')) {
      throw new Error(`Invalid orthogonal edge path: ${edge.path}`);
    }
  }

  return layout;
}

// Test layout on forkGraph expanded and collapsed
const layoutCollapsed = checkNodeOverlaps(forkGraph, { 'node-1': true });
const layoutExpanded = checkNodeOverlaps(forkGraph, { 'node-1': false });

console.log(`✓ ForkGraph layout verified. Collapsed nodes=${layoutCollapsed.nodes.length}, Expanded nodes=${layoutExpanded.nodes.length}`);

// -------------------------------------------------------------
// Test 4: 1000+ Node Deep Branching Layout Stress Test
// -------------------------------------------------------------
console.log('--- Test 4: 1000+ Node Layout & Stress Test ---');

function createDeepTree(count = 1000): any {
  const mapping: Record<string, any> = {
    root: { id: 'root', parent: null, children: ['n-1'] },
  };

  let prev = 'root';
  for (let i = 1; i <= count; i++) {
    const id = `n-${i}`;
    mapping[id] = {
      id,
      parent: prev,
      children: [],
      message: {
        id: `msg-${i}`,
        author: { role: i % 2 === 1 ? 'user' : 'assistant' },
        create_time: i,
        content: { content_type: 'text', parts: [`Content for message ${i} with CJK 中文测试 and special chars & < > " '`] },
      },
    };
    if (mapping[prev]) {
      mapping[prev].children.push(id);
    }

    // Add side branches every 10 nodes
    if (i % 10 === 0 && i + 3 <= count) {
      for (let b = 1; b <= 3; b++) {
        const sideId = `n-${i}-branch-${b}`;
        mapping[sideId] = {
          id: sideId,
          parent: id,
          children: [],
          message: {
            id: `msg-${i}-branch-${b}`,
            author: { role: 'assistant' },
            create_time: i + b * 0.1,
            content: { content_type: 'text', parts: [`Branch ${b} reply for ${i}`] },
          },
        };
        mapping[id].children.push(sideId);
      }
    }

    prev = id;
  }

  return {
    title: '1000+ 节点全量压力测试',
    conversation_id: 'stress-1000',
    current_node: `n-${count}`,
    mapping,
  };
}

const largeTree = createDeepTree(1000);
const largeGraph = parseConversationApiResponse(largeTree)!;

const startLayout = performance.now();
const largeLayout = checkNodeOverlaps(largeGraph);
const layoutTime = performance.now() - startLayout;

console.log(`✓ 1000+ nodes layout calculated in ${layoutTime.toFixed(2)}ms with zero overlaps (width=${largeLayout.width}, height=${largeLayout.height}, nodes=${largeLayout.nodes.length}, edges=${largeLayout.edges.length}).`);

// -------------------------------------------------------------
// Test 5: SVG / Markdown / JSON Exporter Safety & Entity Escaping
// -------------------------------------------------------------
console.log('--- Test 5: Exporter XML Escaping & Safety ---');

const svgOutput = graphToSvg(largeGraph);
if (!svgOutput.startsWith('<svg') || !svgOutput.endsWith('</svg>')) {
  throw new Error('SVG output format invalid.');
}
if (svgOutput.includes('& ') || svgOutput.includes('<Test>')) {
  throw new Error('Unescaped XML entity found in SVG output.');
}
if (!svgOutput.includes('clip-path="url(#node-clip)"')) {
  throw new Error('SVG node clipping path missing.');
}

const mdOutput = graphToMarkdown(largeGraph);
if (!mdOutput.startsWith('# ') || !mdOutput.includes('conversationId:')) {
  throw new Error('Markdown output format invalid.');
}

const jsonOutput = graphToJson(largeGraph);
const parsedJson = JSON.parse(jsonOutput);
if (parsedJson.conversationId !== 'stress-1000') {
  throw new Error('JSON output parse mismatch.');
}

console.log(`✓ SVG (${(svgOutput.length / 1024).toFixed(1)} KB), Markdown (${(mdOutput.length / 1024).toFixed(1)} KB), and JSON exports verified safe.\n`);

console.log('=== ALL COMPREHENSIVE TESTS PASSED SUCCESSFULLY! ===');
