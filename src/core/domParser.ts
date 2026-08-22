import type { ConversationGraph, MessageNode } from '../shared/types';

export function parseDomConversation(conversationId: string): ConversationGraph | null {
  const messageElements = document.querySelectorAll(
    'article, [data-message-author-role], [data-testid^="conversation-turn-"]',
  );

  if (messageElements.length === 0) {
    return null;
  }

  const nodes: Record<string, MessageNode> = {};
  const activePath: string[] = [];
  let prevId: string | null = null;
  let rootId = '';

  messageElements.forEach((el, index) => {
    const roleAttr = el.getAttribute('data-message-author-role');
    const isUser = roleAttr === 'user' || !!el.querySelector('[data-message-author-role="user"]');
    const role: 'user' | 'assistant' = isUser ? 'user' : 'assistant';

    // Extract text content
    const textEl = el.querySelector('.whitespace-pre-wrap, .markdown, .prose, p') || el;
    const content = textEl.textContent?.trim() || '';
    if (!content && index === 0) {
      return;
    }

    const id = `dom-node-${index}`;
    if (!rootId) {
      rootId = id;
    }

    const title = content.length > 30 ? content.slice(0, 30) + '...' : content || (role === 'user' ? '提问' : '回复');

    nodes[id] = {
      id,
      sourceMessageId: id,
      parentId: prevId,
      children: [],
      role,
      title,
      content,
      plainContent: content,
      searchText: `${title} ${content}`.toLowerCase(),
      createdAt: Date.now() - (messageElements.length - index) * 1000,
      active: true,
    };

    if (prevId && nodes[prevId]) {
      nodes[prevId].children.push(id);
    }

    activePath.push(id);
    prevId = id;
  });

  if (activePath.length === 0) {
    return null;
  }

  const pageTitle = document.title.replace(/\s*-\s*ChatGPT$/i, '').trim() || '当前对话';

  return {
    conversationId,
    title: pageTitle,
    rootId: rootId || activePath[0],
    currentLeafId: activePath[activePath.length - 1],
    nodes,
    activePath,
    isForked: false,
    capturedAt: Date.now(),
  };
}
