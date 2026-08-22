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

function aggregateConversationGraphs(
  targetId: string,
  allData: Record<string, any>,
): ConversationGraph | null {
  const target = allData[graphKey(targetId)] as ConversationGraph | undefined;
  if (!target) {
    return null;
  }

  // 1. Gather all stored graphs
  const allStoredGraphs: ConversationGraph[] = Object.entries(allData)
    .filter(([k, v]) => k.startsWith(GRAPH_PREFIX) && v && typeof v === 'object')
    .map(([_, v]) => v as ConversationGraph);

  // 2. Expand family cluster transitively via shared message IDs or conversation parent links
  const familyGraphs: ConversationGraph[] = [target];
  const processed = new Set<string>([target.conversationId]);

  let addedNew = true;
  while (addedNew) {
    addedNew = false;
    const familyNodeIds = new Set(familyGraphs.flatMap((g) => Object.keys(g.nodes || {})));
    const familyConvIds = new Set(familyGraphs.map((g) => g.conversationId));

    for (const g of allStoredGraphs) {
      if (processed.has(g.conversationId)) {
        continue;
      }

      // Check if g shares any message node ID with the family
      const gNodeIds = Object.keys(g.nodes || {});
      const sharesNode = gNodeIds.some((id) => familyNodeIds.has(id));
      const sharesConv = familyConvIds.has(g.parentConversationId || '') ||
        familyGraphs.some((fg) => fg.parentConversationId === g.conversationId);

      if (sharesNode || sharesConv) {
        familyGraphs.push(g);
        processed.add(g.conversationId);
        addedNew = true;
      }
    }
  }

  if (familyGraphs.length <= 1) {
    return target;
  }

  // 3. Merge all nodes into one unified master graph
  const mergedNodes: Record<string, any> = {};
  for (const g of familyGraphs) {
    for (const [nodeId, node] of Object.entries(g.nodes)) {
      if (!mergedNodes[nodeId]) {
        mergedNodes[nodeId] = {
          ...node,
          children: [...node.children],
          active: target.activePath.includes(nodeId),
        };
      } else {
        const existing = mergedNodes[nodeId];
        const combinedChildren = Array.from(new Set([...existing.children, ...node.children]));
        mergedNodes[nodeId] = {
          ...existing,
          children: combinedChildren,
          active: target.activePath.includes(nodeId) || existing.active,
        };
      }
    }
  }

  // 4. Determine true global root ID (the earliest node without parents or parent not in mapping)
  const allChildIds = new Set(Object.values(mergedNodes).flatMap((n: any) => n.children));
  const candidateRoots = Object.keys(mergedNodes).filter((id) => !mergedNodes[id].parentId || !allChildIds.has(id));

  // Sort candidate roots by createdAt ascending to find the true original starting message
  candidateRoots.sort((a, b) => (mergedNodes[a].createdAt ?? 0) - (mergedNodes[b].createdAt ?? 0));
  const globalRootId = candidateRoots[0] || target.rootId;

  // 5. Re-link parentId for all children
  for (const [pId, pNode] of Object.entries(mergedNodes)) {
    for (const cId of (pNode as any).children) {
      if (mergedNodes[cId] && !mergedNodes[cId].parentId) {
        mergedNodes[cId].parentId = pId;
      }
    }
  }

  return {
    ...target,
    rootId: globalRootId,
    nodes: mergedNodes,
    activePath: target.activePath,
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

      const all = await chrome.storage.local.get(null);
      const aggregated = aggregateConversationGraphs(conversationId, all);
      return respond(aggregated ?? all[graphKey(conversationId)] ?? null);
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

    case MessageTypes.TogglePanel: {
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
