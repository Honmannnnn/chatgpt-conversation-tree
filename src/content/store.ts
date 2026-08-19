import { create } from 'zustand';
import type { ConversationGraph } from '../shared/types';

interface ConversationTreeState {
  graph: ConversationGraph | null;
  panelOpen: boolean;
  selectedNodeId: string | null;
  searchQuery: string;
  collapsed: Record<string, boolean>;
  isRefreshing: boolean;
  notice: string | null;
  setGraph: (graph: ConversationGraph | null) => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleCollapsed: (nodeId: string) => void;
  setIsRefreshing: (refreshing: boolean) => void;
  setNotice: (notice: string | null) => void;
}

export const useConversationTreeStore = create<ConversationTreeState>((set) => ({
  graph: null,
  panelOpen: false,
  selectedNodeId: null,
  searchQuery: '',
  collapsed: {},
  isRefreshing: false,
  notice: null,
  setGraph: (graph) => set({ graph, selectedNodeId: null, collapsed: {} }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleCollapsed: (nodeId) => set((state) => ({
    collapsed: {
      ...state.collapsed,
      [nodeId]: !state.collapsed[nodeId],
    },
  })),
  setIsRefreshing: (isRefreshing) => set({ isRefreshing }),
  setNotice: (notice) => set({ notice }),
}));
