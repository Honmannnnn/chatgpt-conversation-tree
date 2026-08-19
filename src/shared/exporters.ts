import { buildTreeLayout } from '../core/layout';
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
  const width = Math.max(1200, layout.width);
  const height = Math.max(480, layout.height);
  const background = '#f9fafb';
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <rect width="100%" height="100%" fill="${background}" />`,
    `  <text x="24" y="32" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#111827">${escapeXml(graph.title)}</text>`,
    `  <text x="24" y="52" font-family="Arial, sans-serif" font-size="11" fill="#6b7280">${escapeXml(graph.conversationId)}</text>`,
  ];

  for (const edge of layout.edges) {
    const active = graph.nodes[edge.source]?.active && graph.nodes[edge.target]?.active;
    lines.push(`  <path d="${edge.path}" fill="none" stroke="${active ? '#10a37f' : '#9ca3af'}" stroke-width="${active ? 2.2 : 1.4}" />`);
  }

  for (const layoutNode of layout.nodes) {
    const node = layoutNode.node;
    const accent = nodeColor(node);
    const content = node.content.replace(/\s+/g, ' ').trim();
    const title = node.title.replace(/\s+/g, ' ').trim();
    lines.push(
      `  <g transform="translate(${layoutNode.x} ${layoutNode.y})">`,
      `    <rect width="${layoutNode.width}" height="${layoutNode.height}" rx="9" fill="#ffffff" stroke="${node.active ? '#10a37f' : '#d1d5db'}" stroke-width="${node.active ? 1.6 : 1}" />`,
      `    <rect width="3" height="${layoutNode.height}" rx="1.5" fill="${accent}" />`,
      `    <text x="14" y="20" font-family="Arial, sans-serif" font-size="9" font-weight="700" fill="${accent}">${escapeXml(roleText(node))}</text>`,
      `    <text x="14" y="38" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#111827">${escapeXml(title.slice(0, 28))}</text>`,
      `    <text x="14" y="55" font-family="Arial, sans-serif" font-size="10" fill="#6b7280">${escapeXml(content.slice(0, 42))}</text>`,
      node.versionLabel ? `    <text x="${layoutNode.width - 24}" y="20" font-family="Arial, sans-serif" font-size="9" font-weight="700" fill="#6b7280">${escapeXml(node.versionLabel)}</text>` : '',
      `  </g>`,
    );
  }

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
