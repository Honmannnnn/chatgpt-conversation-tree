export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface MessageNode {
  id: string;
  sourceMessageId: string;
  role: MessageRole;
  content: string;
  plainContent: string;
  title: string;
  parentId: string | null;
  children: string[];
  createdAt: number | null;
  modelSlug?: string;
  active: boolean;
  versionGroupId?: string;
  versionLabel?: string;
}

export interface ConversationGraph {
  conversationId: string;
  title: string;
  currentLeafId: string | null;
  rootId: string | null;
  nodes: Record<string, MessageNode>;
  activePath: string[];
  capturedAt: number;
}

export interface TreeLayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  node: MessageNode;
}

export interface TreeLayoutEdge {
  source: string;
  target: string;
  path: string;
}

export interface TreeLayout {
  width: number;
  height: number;
  nodes: TreeLayoutNode[];
  edges: TreeLayoutEdge[];
  roots: string[];
}

export interface CapturedApiResponse {
  url: string;
  status: number;
  body: unknown;
  capturedAt: number;
}

export interface ExtensionRequest {
  type: string;
  payload?: unknown;
}

export interface ExtensionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface CurrentConversationPayload {
  conversationId: string;
  title?: string;
  activeMessageId?: string;
}
