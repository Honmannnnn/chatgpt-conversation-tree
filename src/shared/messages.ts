export const MessageTypes = {
  CaptureApiResponse: 'CTREE_CAPTURE_API_RESPONSE',
  GraphUpdated: 'CTREE_GRAPH_UPDATED',
  GetGraph: 'CTREE_GET_GRAPH',
  ClearGraph: 'CTREE_CLEAR_GRAPH',
  SetActiveNode: 'CTREE_SET_ACTIVE_NODE',
  TogglePanel: 'CTREE_TOGGLE_PANEL',
  FetchConversation: 'CTREE_FETCH_CONVERSATION',
} as const;

export type MessageType = (typeof MessageTypes)[keyof typeof MessageTypes];
