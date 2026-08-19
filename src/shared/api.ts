import type { ConversationGraph, MessageNode, MessageRole } from './types';
import { markdownToPlainText } from './markdown';

type JsonRecord = Record<string, any>;

const textParts = new Set(['text', 'text/code', 'code', 'output_text', 'tool_call']);

function isPlainObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (isPlainObject(value)) {
    if (typeof value.text === 'string') {
      return value.text;
    }

    if (typeof value.content === 'string') {
      return value.content;
    }

    if (typeof value.name === 'string' && typeof value.arguments === 'string') {
      return `${value.name}(${value.arguments})`;
    }
  }

  return '';
}

function extractContent(message: JsonRecord): string {
  const content = message.content;

  if (!isPlainObject(content)) {
    return asString(content);
  }

  const parts = Array.isArray(content.parts) ? content.parts : [];
  const lines: string[] = [];

  for (const part of parts) {
    if (typeof part === 'string') {
      lines.push(part);
      continue;
    }

    if (isPlainObject(part)) {
      const contentType = typeof part.content_type === 'string' ? part.content_type : '';
      const value = asString(part);

      if (value.trim()) {
        lines.push(value);
      } else if (textParts.has(contentType) && typeof part.text === 'string') {
        lines.push(part.text);
      }
    }
  }

  const result = lines.join('\n\n').trim();
  return result || asString(content) || '[空消息]';
}

function roleFromAuthor(author: unknown): MessageRole {
  const role = isPlainObject(author) && typeof author.role === 'string'
    ? author.role.toLowerCase()
    : '';

  if (role === 'tool') {
    return 'tool';
  }

  if (role === 'system') {
    return 'system';
  }

  if (role === 'assistant') {
    return 'assistant';
  }

  return 'user';
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  return values.find((value) => typeof value === 'string' && value.trim()) ?? '';
}

export function isConversationApiUrl(url: string): boolean {
  return /\/backend-api\/conversation(\/|\?|$)/i.test(url) && !/\/backend-api\/conversations\//i.test(url);
}

export function extractConversationIdFromUrl(url: string): string | null {
  const match = url.match(/\/conversation\/([a-zA-Z0-9_-]+)/i);
  return match?.[1] ?? null;
}

function buildVersionGroups(nodes: MessageNode[]): Map<string, { groupId: string; label: string }> {
  const byParentRole = new Map<string, MessageNode[]>();

  for (const node of nodes) {
    const key = `${node.parentId ?? 'root'}:${node.role}`;
    const group = byParentRole.get(key) ?? [];
    group.push(node);
    byParentRole.set(key, group);
  }

  const result = new Map<string, { groupId: string; label: string }>();

  for (const group of byParentRole.values()) {
    if (group.length <= 1) {
      continue;
    }

    group.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    const groupId = group.map((node) => node.id).sort().join(':');

    group.forEach((node, index) => {
      result.set(node.id, {
        groupId,
        label: `${index + 1}/${group.length}`,
      });
    });
  }

  return result;
}

export function parseConversationApiResponse(payload: unknown): ConversationGraph | null {
  if (!isPlainObject(payload)) {
    return null;
  }

  const mapping = payload.mapping;
  if (!isPlainObject(mapping)) {
    return null;
  }

  const conversationId = firstNonEmpty(
    typeof payload.conversation_id === 'string' ? payload.conversation_id : '',
    typeof payload.id === 'string' ? payload.id : '',
  );

  if (!conversationId) {
    return null;
  }

  const title = typeof payload.title === 'string' ? payload.title : '未命名对话';
  const currentLeafId = typeof payload.current_node === 'string' ? payload.current_node : null;
  const nodes: MessageNode[] = [];

  for (const [nodeId, rawNode] of Object.entries(mapping)) {
    if (!isPlainObject(rawNode)) {
      continue;
    }

    const message = rawNode.message;
    if (!isPlainObject(message)) {
      continue;
    }

    const messageId = firstNonEmpty(
      typeof message.id === 'string' ? message.id : '',
      typeof rawNode.id === 'string' ? rawNode.id : nodeId,
    );

    const role = roleFromAuthor(message.author);
    const content = extractContent(message);
    const plainContent = markdownToPlainText(content);
    const parentId = typeof rawNode.parent === 'string' ? rawNode.parent : null;
    const children = Array.isArray(rawNode.children)
      ? rawNode.children.filter((child): child is string => typeof child === 'string')
      : [];

    nodes.push({
      id: nodeId,
      sourceMessageId: messageId,
      role,
      content,
      plainContent,
      title: `${role === 'user' ? '提问' : role === 'assistant' ? '回复' : role} · ${plainContent.slice(0, 48) || messageId}`,
      parentId,
      children,
      createdAt: typeof message.create_time === 'number' ? message.create_time : null,
      modelSlug: typeof message.metadata?.model_slug === 'string' ? message.metadata.model_slug : undefined,
      active: false,
    });
  }

  if (nodes.length === 0) {
    return null;
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const validNodeIds = new Set(nodeMap.keys());
  const versionGroups = buildVersionGroups(nodes);

  for (const node of nodes) {
    node.parentId = node.parentId && validNodeIds.has(node.parentId) ? node.parentId : null;
    node.children = node.children.filter((childId) => validNodeIds.has(childId));
    const version = versionGroups.get(node.id);
    node.versionGroupId = version?.groupId;
    node.versionLabel = version?.label;
  }

  const childIds = new Set(nodes.flatMap((node) => node.children));
  const roots = nodes.filter((node) => !node.parentId || !childIds.has(node.id) && !node.parentId).map((node) => node.id);
  const rootId = roots.length === 1 ? roots[0] : null;

  const activePath: string[] = [];
  let cursorId = currentLeafId && validNodeIds.has(currentLeafId) ? currentLeafId : null;
  const visited = new Set<string>();

  while (cursorId && validNodeIds.has(cursorId) && !visited.has(cursorId)) {
    const node = nodeMap.get(cursorId)!;
    node.active = true;
    activePath.unshift(cursorId);
    visited.add(cursorId);
    cursorId = node.parentId;
  }

  const graph: ConversationGraph = {
    conversationId,
    title,
    currentLeafId,
    rootId,
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    activePath,
    capturedAt: Date.now(),
  };

  return graph;
}
