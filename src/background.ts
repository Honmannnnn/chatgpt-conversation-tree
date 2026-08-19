import { MessageTypes } from './shared/messages';
import type { ConversationGraph, ExtensionRequest, ExtensionResponse } from './shared/types';

const CURRENT_CONVERSATION_KEY = 'ctree_current_conversation_id';
const GRAPH_PREFIX = 'ctree_conversation:';
const SCHEMA_VERSION_KEY = 'ctree_schema_version';
const SCHEMA_VERSION = 1;
const MAX_STORED_CONVERSATIONS = 30;

function graphKey(conversationId: string): string {
  return `${GRAPH_PREFIX}${conversationId}`;
}

function respond<T>(data?: T): ExtensionResponse<T> {
  return {
    ok: true,
    data,
  };
}

function respondError(error: string): ExtensionResponse {
  return {
    ok: false,
    error,
  };
}

async function pruneOldGraphs(): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const graphEntries = Object.entries(all)
    .filter(([key]) => key.startsWith(GRAPH_PREFIX))
    .map(([key, value]) => ({
      key,
      capturedAt: (value as ConversationGraph | undefined)?.capturedAt ?? 0,
    }))
    .sort((a, b) => b.capturedAt - a.capturedAt);

  if (graphEntries.length <= MAX_STORED_CONVERSATIONS) {
    return;
  }

  const keysToRemove = graphEntries
    .slice(MAX_STORED_CONVERSATIONS)
    .map((entry) => entry.key);

  await chrome.storage.local.remove(keysToRemove);
}

async function handleMessage(
  message: ExtensionRequest,
): Promise<ExtensionResponse> {
  switch (message.type) {
    case MessageTypes.CaptureApiResponse: {
      const graph = message.payload as ConversationGraph | undefined;
      if (!graph?.conversationId) {
        return respondError('Graph payload is missing.');
      }

      await chrome.storage.local.set({
        [CURRENT_CONVERSATION_KEY]: graph.conversationId,
        [graphKey(graph.conversationId)]: graph,
      });
      await pruneOldGraphs();

      return respond({ conversationId: graph.conversationId });
    }

    case MessageTypes.GetGraph: {
      const payload = message.payload as { conversationId?: string } | undefined;
      const requestedId = payload?.conversationId;
      const conversationId = requestedId ?? await chrome.storage.local.get(CURRENT_CONVERSATION_KEY)
        .then((result) => result[CURRENT_CONVERSATION_KEY] as string | undefined);

      if (!conversationId) {
        return respond(null);
      }

      const result = await chrome.storage.local.get(graphKey(conversationId));
      return respond(result[graphKey(conversationId)] ?? null);
    }

    case MessageTypes.ClearGraph: {
      const current = await chrome.storage.local.get(CURRENT_CONVERSATION_KEY);
      const conversationId = current[CURRENT_CONVERSATION_KEY] as string | undefined;

      if (conversationId) {
        await chrome.storage.local.remove(graphKey(conversationId));
      }

      await chrome.storage.local.remove(CURRENT_CONVERSATION_KEY);
      return respond();
    }

    case MessageTypes.FetchConversation: {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, message).catch(() => undefined);
      }

      return respond();
    }

    default:
      return respondError(`Unsupported message type: ${String(message.type)}`);
  }
}

chrome.runtime.onMessage.addListener((message: ExtensionRequest, _sender, sendResponse) => {
  void handleMessage(message)
    .then((response) => sendResponse(response))
    .catch((error: unknown) => sendResponse(respondError(error instanceof Error ? error.message : String(error))));

  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.set({
    ctree_installed_at: Date.now(),
    [SCHEMA_VERSION_KEY]: SCHEMA_VERSION,
  });
});

void chrome.storage.local.get(SCHEMA_VERSION_KEY).then((result) => {
  if (result[SCHEMA_VERSION_KEY] !== SCHEMA_VERSION) {
    void chrome.storage.local.set({ [SCHEMA_VERSION_KEY]: SCHEMA_VERSION });
  }
});
