import { MessageTypes } from './shared/messages';
import type { ConversationGraph, ExtensionRequest, ExtensionResponse } from './shared/types';

const CURRENT_CONVERSATION_KEY = 'ctree_current_conversation_id';
const GRAPH_PREFIX = 'ctree_conversation:';

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
  void chrome.storage.local.set({ ctree_installed_at: Date.now() });
});
