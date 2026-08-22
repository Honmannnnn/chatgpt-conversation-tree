import { createRoot } from 'react-dom/client';
import { App } from './App';
import { MessageTypes } from '../shared/messages';
import { parseConversationApiResponse } from '../shared/api';
import { useConversationTreeStore } from './store';
import styles from './styles.css?inline';

const HOST_ID = 'ctree-root';
const INJECTED_SCRIPT_ID = 'ctree-injected';
const MESSAGE_SOURCE = 'chatgpt-conversation-tree';
const captureNonce = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

function isDarkTheme(): boolean {
  const html = document.documentElement;
  const body = document.body;
  const explicitDark = [
    html,
    body,
  ].some((element) => {
    if (!element) {
      return false;
    }

    return element.classList.contains('dark')
      || element.dataset.theme === 'dark'
      || element.dataset.colorScheme === 'dark'
      || element.getAttribute('data-color-scheme') === 'dark';
  });

  if (explicitDark) {
    return true;
  }

  const background = body ? getComputedStyle(body).backgroundColor : '';
  if (background && background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') {
    const match = background.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const luminance = (Number(match[1]) * 0.2126 + Number(match[2]) * 0.7152 + Number(match[3]) * 0.0722) / 255;
      return luminance < 0.32;
    }
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function mountUi(): void {
  const existingHost = document.getElementById(HOST_ID) as HTMLDivElement | null;
  if (existingHost?.shadowRoot) {
    return;
  }

  const host = existingHost ?? document.createElement('div');
  host.id = HOST_ID;
  host.dataset.ctreeHost = 'true';
  const applyTheme = () => {
    host.dataset.theme = isDarkTheme() ? 'dark' : 'light';
  };
  applyTheme();
  const themeObserver = new MutationObserver(() => {
    applyTheme();
  });
  const themeObserverOptions: MutationObserverInit = {
    attributes: true,
    attributeFilter: ['class', 'style', 'data-theme', 'data-color-scheme'],
  };
  themeObserver.observe(document.documentElement, themeObserverOptions);
  if (document.body) {
    themeObserver.observe(document.body, themeObserverOptions);
  }
  const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');
  darkMedia.addEventListener?.('change', applyTheme);
  const ensureHostConnected = () => {
    const parent = document.body ?? document.documentElement;
    if (!host.isConnected) {
      parent.appendChild(host);
    } else if (document.body && host.parentElement !== document.body) {
      document.body.appendChild(host);
    }

    if (document.body && !themeObserver.takeRecords().some(() => false)) {
      themeObserver.observe(document.body, themeObserverOptions);
    }
  };
  window.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    ensureHostConnected();
  });
  if (document.body) {
    ensureHostConnected();
  } else {
    document.documentElement.appendChild(host);
  }
  window.setInterval(ensureHostConnected, 2000);

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
  const appendScript = () => {
    if (!document.head) {
      return;
    }

    document.getElementById(INJECTED_SCRIPT_ID)?.remove();

    const script = document.createElement('script');
    script.id = INJECTED_SCRIPT_ID;
    script.src = chrome.runtime.getURL('injected.js');
    script.dataset.ctreeInjected = 'true';
    script.dataset.ctreeNonce = captureNonce;
    document.head.appendChild(script);
  };

  appendScript();

  if (!document.getElementById(INJECTED_SCRIPT_ID)) {
    const headObserver = new MutationObserver(() => {
      if (document.head) {
        headObserver.disconnect();
        appendScript();
      }
    });
    headObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    window.addEventListener('DOMContentLoaded', () => {
      headObserver.disconnect();
      appendScript();
    });
  }
}

function handlePageMessage(event: MessageEvent): void {
  if (event.source !== window || !event.data || typeof event.data !== 'object') {
    return;
  }

  const message = event.data as Record<string, any>;
  if (message.source !== MESSAGE_SOURCE || message.nonce !== captureNonce) {
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
  window.location.reload();
}

window.addEventListener('message', handlePageMessage);

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
