import type { ConversationGraph, MessageNode } from '../shared/types';

const HIGHLIGHT_STYLE_ID = 'ctree-highlight-style';
const HIGHLIGHT_CLASS = 'ctree-flash-message';

function quoteSelector(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function ensureHighlightStyle(): void {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 3px solid #10a37f !important;
      outline-offset: 5px !important;
      border-radius: 12px !important;
      animation: ctree-message-pulse 1.1s ease-out;
    }

    @keyframes ctree-message-pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 163, 127, 0.35); }
      70% { box-shadow: 0 0 0 14px rgba(16, 163, 127, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 163, 127, 0); }
    }
  `;
  document.head.appendChild(style);
}

function flashMessageElement(element: HTMLElement): void {
  ensureHighlightStyle();
  element.classList.remove(HIGHLIGHT_CLASS);
  void element.offsetWidth;
  element.classList.add(HIGHLIGHT_CLASS);
  window.setTimeout(() => element.classList.remove(HIGHLIGHT_CLASS), 1300);
}

export function findMessageElement(sourceMessageId: string): HTMLElement | null {
  const id = quoteSelector(sourceMessageId);
  const selectors = [
    `[data-message-id="${id}"]`,
    `[data-message-author-role][data-message-id="${id}"]`,
    `article[data-message-id="${id}"]`,
  ];

  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      return element;
    }
  }

  const candidates = Array.from(document.querySelectorAll<HTMLElement>('[data-message-id]'));
  return candidates.find((element) => element.dataset.messageId === sourceMessageId) ?? null;
}

function getVersionSiblings(graph: ConversationGraph, node: MessageNode): MessageNode[] {
  if (!node.versionGroupId) {
    return [node];
  }

  return Object.values(graph.nodes)
    .filter((candidate) => candidate.versionGroupId === node.versionGroupId)
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

function findVisibleSiblingElement(graph: ConversationGraph, node: MessageNode): { element: HTMLElement; node: MessageNode } | null {
  const siblings = getVersionSiblings(graph, node);

  for (const sibling of siblings) {
    const element = findMessageElement(sibling.sourceMessageId);
    if (element) {
      return { element, node: sibling };
    }
  }

  return null;
}

function findVisibleAncestorElement(graph: ConversationGraph, node: MessageNode): { element: HTMLElement; node: MessageNode } | null {
  let cursorId = node.parentId;

  while (cursorId && graph.nodes[cursorId]) {
    const ancestor = graph.nodes[cursorId];
    const element = findMessageElement(ancestor.sourceMessageId);
    if (element) {
      return { element, node: ancestor };
    }
    cursorId = ancestor.parentId;
  }

  return null;
}

interface BranchControls {
  previous: HTMLElement[];
  next: HTMLElement[];
}

function labelMatches(label: string, direction: 'previous' | 'next'): boolean {
  const value = label.toLowerCase();
  if (direction === 'previous') {
    return /previous|上一|上一个|prev|earlier/i.test(value);
  }

  return /next|下一|下一个|newer|later/i.test(value);
}

function controlsFromButtons(buttons: HTMLElement[]): BranchControls {
  const controls: BranchControls = {
    previous: [],
    next: [],
  };

  for (const button of buttons) {
    const ariaLabel = button.getAttribute('aria-label') ?? '';
    const title = button.getAttribute('title') ?? '';
    const testId = button.dataset.testid ?? '';
    const text = button.textContent ?? '';

    if (labelMatches(`${ariaLabel} ${title} ${testId} ${text}`, 'previous')) {
      controls.previous.push(button);
    }

    if (labelMatches(`${ariaLabel} ${title} ${testId} ${text}`, 'next')) {
      controls.next.push(button);
    }
  }

  return controls;
}

function ancestorChain(element: HTMLElement): HTMLElement[] {
  const chain: HTMLElement[] = [];
  let cursor: HTMLElement | null = element;
  while (cursor) {
    chain.push(cursor);
    cursor = cursor.parentElement;
  }
  return chain;
}

function domDistance(a: HTMLElement, b: HTMLElement): number {
  const chainA = ancestorChain(a);
  const chainB = ancestorChain(b);
  const bIndex = new Map(chainB.map((element, index) => [element, index]));

  for (let indexA = 0; indexA < chainA.length; indexA += 1) {
    const indexB = bIndex.get(chainA[indexA]);
    if (indexB !== undefined) {
      return indexA + indexB;
    }
  }

  return Number.POSITIVE_INFINITY;
}

function findBranchControls(element: HTMLElement): BranchControls {
  let cursor: HTMLElement | null = element;

  for (let depth = 0; cursor && depth < 12; depth += 1) {
    const buttons = Array.from(cursor.querySelectorAll<HTMLElement>('button'));
    const controls = controlsFromButtons(buttons);

    if (controls.previous.length || controls.next.length) {
      return controls;
    }

    cursor = cursor.parentElement;
  }

  const candidates = Array.from(document.querySelectorAll<HTMLElement>(
    'button[aria-label="上一回复"], button[aria-label="下一回复"], button[data-testid*="prev-button"], button[data-testid*="next-button"]',
  ));

  if (!candidates.length) {
    return { previous: [], next: [] };
  }

  const nearest = candidates.sort((a, b) => domDistance(element, a) - domDistance(element, b));
  return controlsFromButtons(nearest.slice(0, 4));
}

function scrollToMessage(element: HTMLElement): void {
  element.scrollIntoView({
    behavior: 'auto',
    block: 'center',
    inline: 'nearest',
  });
  flashMessageElement(element);
}

export interface NavigationResult {
  found: boolean;
  switched: boolean;
}

export async function navigateToNode(
  graph: ConversationGraph,
  nodeId: string,
): Promise<NavigationResult> {
  const node = graph.nodes[nodeId];
  if (!node) {
    return { found: false, switched: false };
  }

  let target = findMessageElement(node.sourceMessageId);
  if (target) {
    scrollToMessage(target);
    return { found: true, switched: false };
  }

  const visibleSibling = findVisibleSiblingElement(graph, node);
  if (visibleSibling) {
    const siblings = getVersionSiblings(graph, node);
    const targetIndex = siblings.findIndex((sibling) => sibling.id === node.id);
    const visibleIndex = siblings.findIndex((sibling) => sibling.id === visibleSibling.node.id);

    if (targetIndex >= 0 && visibleIndex >= 0 && targetIndex !== visibleIndex) {
      const direction = targetIndex > visibleIndex ? 'next' : 'previous';
      const maxSteps = Math.min(Math.abs(targetIndex - visibleIndex), 6);
      let controls = findBranchControls(visibleSibling.element);

      for (let step = 0; step < maxSteps; step += 1) {
        const button = (direction === 'next' ? controls.next[0] : controls.previous[0]) as HTMLButtonElement | undefined;
        if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') {
          break;
        }

        button.click();
        await wait(120);

        target = findMessageElement(node.sourceMessageId);
        if (target) {
          scrollToMessage(target);
          return { found: true, switched: true };
        }

        const nextVisible = findVisibleSiblingElement(graph, node);
        if (nextVisible) {
          controls = findBranchControls(nextVisible.element);
        }
      }
    }
  }

  const visibleAncestor = findVisibleAncestorElement(graph, node);
  if (visibleAncestor) {
    for (const direction of ['next', 'previous'] as const) {
      let controls = findBranchControls(visibleAncestor.element);

      for (let step = 0; step < 3; step += 1) {
        const button = (direction === 'next' ? controls.next[0] : controls.previous[0]) as HTMLButtonElement | undefined;
        if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') {
          break;
        }

        button.click();
        await wait(120);

        target = findMessageElement(node.sourceMessageId);
        if (target) {
          scrollToMessage(target);
          return { found: true, switched: true };
        }

        const nextVisible = findVisibleSiblingElement(graph, node);
        if (nextVisible) {
          controls = findBranchControls(nextVisible.element);
        }
      }
    }
  }

  target = findMessageElement(node.sourceMessageId);
  if (target) {
    scrollToMessage(target);
    return { found: true, switched: true };
  }

  return { found: false, switched: true };
}
