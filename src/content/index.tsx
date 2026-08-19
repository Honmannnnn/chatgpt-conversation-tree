import { createRoot } from 'react-dom/client';
import { App } from './App';
import { MessageTypes } from '../shared/messages';
import { parseConversationApiResponse } from '../shared/api';
import { useConversationTreeStore } from './store';
import styles from './styles.css?inline';

const HOST_ID = 'ctree-root';
const INJECTED_SCRIPT_ID = 'ctree-injected';

function getConversationIdFromLocation(): string | null {
  const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

function mountUi(): void {
  if (document.getElementById(HOST_ID)) {
    return;
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.dataset.ctreeHost = 'true';
  const applyTheme = () => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark')
      || root.dataset.theme === 'dark'
      || root.dataset.colorScheme === 'dark';
    host.dataset.theme = isDark ? 'dark' : 'light';
  };
  applyTheme();
  const themeObserver = new MutationObserver(applyTheme);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'data-color-scheme'],
  });
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  shadow.appendChild(style);

  const root = document.createElement('div');
  root.id = 'ctree-app';
  shadow.appendChild(root);

  createRoot(root).render(<App />);
}

function injectNetworkCapture(): void {
  if (document.getElementById(INJECTED_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement('script');
  script.id = INJECTED_SCRIPT_ID;
  script.src = chrome.runtime.getURL('injected.js');
  script.dataset.ctreeInjected = 'true';
  (document.head || document.documentElement).appendChild(script);
}

function handlePageMessage(event: MessageEvent): void {
  if (event.source !== window || !event.data || typeof event.data !== 'object') {
    return;
  }

  const message = event.data as Record<string, any>;
  if (message.source !== 'chatgpt-conversation-tree') {
    return;
  }

  if (message.type === 'API_RESPONSE') {
    const graph = parseConversationApiResponse(message.payload?.body);

    if (graph) {
      useConversationTreeStore.getState().setGraph(graph);
      void chrome.runtime.sendMessage({
        type: MessageTypes.CaptureApiResponse,
        payload: graph,
      }).catch(() => undefined);
    }
  }
}

function requestRefresh(): void {
  const conversationId = getConversationIdFromLocation();
  if (!conversationId) {
    return;
  }

  window.postMessage(
    {
      source: 'ctree-content',
      type: 'FETCH_CONVERSATION',
      conversationId,
    },
    '*',
  );
}

function requestInitialRefresh(): void {
  if (getConversationIdFromLocation()) {
    requestRefresh();
  }
}

window.addEventListener('message', handlePageMessage);
window.addEventListener('load', requestInitialRefresh);

if (document.readyState === 'complete') {
  requestInitialRefresh();
}

chrome.runtime.onMessage.addListener((message: any) => {
  if (message?.type === MessageTypes.TogglePanel) {
    useConversationTreeStore.getState().togglePanel();
  }

  if (message?.type === MessageTypes.FetchConversation) {
    requestRefresh();
  }

  return false;
});

injectNetworkCapture();
mountUi();
