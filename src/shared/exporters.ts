import { buildTreeLayout } from '../core/layout';
import { truncateToWidth } from './markdown';
import type { ConversationGraph, MessageNode } from './types';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeMarkdown(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\n{3,}/g, '\n\n');
}

function downloadText(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function roleText(node: MessageNode): string {
  if (node.role === 'assistant') {
    return '模型回复';
  }

  if (node.role === 'tool') {
    return '工具调用';
  }

  if (node.role === 'system') {
    return '系统消息';
  }

  return '用户提问';
}

function nodeColor(node: MessageNode): string {
  if (node.active) {
    return '#10a37f';
  }

  if (node.role === 'assistant') {
    return '#10a37f';
  }

  if (node.role === 'tool') {
    return '#d97706';
  }

  return '#2563eb';
}

function sortNodes(graph: ConversationGraph): MessageNode[] {
  return Object.values(graph.nodes).sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

export function graphToJson(graph: ConversationGraph): string {
  return JSON.stringify(graph, null, 2);
}

export function graphToMarkdown(graph: ConversationGraph): string {
  const lines = [
    `# ${graph.title}`,
    '',
    `> conversationId: ${graph.conversationId}`,
    `> capturedAt: ${new Date(graph.capturedAt).toISOString()}`,
    '',
  ];

  for (const node of sortNodes(graph)) {
    const parent = node.parentId ? graph.nodes[node.parentId] : null;
    lines.push(
      `## ${roleText(node)}`,
      '',
      `- id: ${node.id}`,
      `- messageId: ${node.sourceMessageId}`,
      parent ? `- parent: ${parent.title}` : '- parent: null',
      node.versionLabel ? `- version: ${node.versionLabel}` : '- version: 单版本',
      '',
      escapeMarkdown(node.content || '[空消息]'),
      '',
      '---',
      '',
    );
  }

  return lines.join('\n').trim();
}

export function graphToSvg(graph: ConversationGraph): string {
  const layout = buildTreeLayout(graph);
  const paddingX = 40;
  const paddingTop = 96;
  const paddingBottom = 48;

  const minX = layout.nodes.length ? Math.min(...layout.nodes.map((n) => n.x)) : 0;
  const maxX = layout.nodes.length ? Math.max(...layout.nodes.map((n) => n.x + n.width)) : 1000;
  const minY = layout.nodes.length ? Math.min(...layout.nodes.map((n) => n.y)) : 0;
  const maxY = layout.nodes.length ? Math.max(...layout.nodes.map((n) => n.y + n.height)) : 400;

  const offsetX = paddingX - minX;
  const offsetY = paddingTop - minY;

  const width = Math.max(1000, maxX - minX + paddingX * 2);
  const height = Math.max(480, maxY - minY + paddingTop + paddingBottom);
  const background = '#f9fafb';

  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <defs>`,
    `    <style>`,
    `      .svg-title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 700; fill: #111827; }`,
    `      .svg-sub { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; fill: #6b7280; }`,
    `      .node-role { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 9px; font-weight: 700; }`,
    `      .node-title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12px; font-weight: 700; fill: #111827; }`,
    `      .node-desc { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10px; fill: #6b7280; }`,
    `      .node-ver { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 9px; font-weight: 700; fill: #6b7280; }`,
    `    </style>`,
    `    <clipPath id="node-clip">`,
    `      <rect width="236" height="78" rx="9" />`,
    `    </clipPath>`,
    `  </defs>`,
    `  <rect width="100%" height="100%" fill="${background}" />`,
    `  <text x="${paddingX}" y="36" class="svg-title">${escapeXml(graph.title)}</text>`,
    `  <text x="${paddingX}" y="58" class="svg-sub">${escapeXml(graph.conversationId)} · ${Object.keys(graph.nodes).length} 节点 · 活跃路径 ${graph.activePath.length} 层</text>`,
    `  <g transform="translate(${offsetX}, ${offsetY})">`,
    `    <g class="edges">`,
  ];

  for (const edge of layout.edges) {
    const active = graph.nodes[edge.source]?.active && graph.nodes[edge.target]?.active;
    lines.push(`      <path d="${edge.path}" fill="none" stroke="${active ? '#10a37f' : '#9ca3af'}" stroke-width="${active ? 2.2 : 1.4}" />`);
  }
  lines.push(`    </g>`);
  lines.push(`    <g class="nodes">`);

  for (const layoutNode of layout.nodes) {
    const node = layoutNode.node;
    const accent = nodeColor(node);
    const content = node.plainContent || node.content;
    const title = node.title || content;
    const maxTextWidth = layoutNode.width - 28;
    const safeTitle = truncateToWidth(title, maxTextWidth, 12);
    const safeContent = truncateToWidth(content, maxTextWidth, 10);

    lines.push(
      `      <g transform="translate(${layoutNode.x} ${layoutNode.y})" clip-path="url(#node-clip)">`,
      `        <rect width="${layoutNode.width}" height="${layoutNode.height}" rx="9" fill="#ffffff" stroke="${node.active ? '#10a37f' : '#d1d5db'}" stroke-width="${node.active ? 1.6 : 1}" />`,
      `        <rect width="3" height="${layoutNode.height}" rx="1.5" fill="${accent}" />`,
      `        <text x="14" y="20" class="node-role" fill="${accent}">${escapeXml(roleText(node))}</text>`,
      `        <text x="14" y="38" class="node-title">${escapeXml(safeTitle)}</text>`,
      `        <text x="14" y="55" class="node-desc">${escapeXml(safeContent)}</text>`,
      node.versionLabel ? `        <text x="${layoutNode.width - 14}" y="20" class="node-ver" text-anchor="end">${escapeXml(node.versionLabel)}</text>` : '',
      `      </g>`,
    );
  }

  lines.push(`    </g>`);
  lines.push(`  </g>`);
  lines.push('</svg>');
  return lines.join('\n');
}

export function downloadJson(graph: ConversationGraph): void {
  downloadText(graphToJson(graph), `${safeFilename(graph.title)}.conversation-tree.json`, 'application/json');
}

export function downloadMarkdown(graph: ConversationGraph): void {
  downloadText(graphToMarkdown(graph), `${safeFilename(graph.title)}.conversation-tree.md`, 'text/markdown');
}

export function downloadSvg(graph: ConversationGraph): void {
  downloadText(graphToSvg(graph), `${safeFilename(graph.title)}.conversation-tree.svg`, 'image/svg+xml');
}

function safeFilename(value: string): string {
  const clean = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return clean || 'chatgpt-conversation-tree';
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
