import { create } from 'zustand';
import type { ConversationGraph, MessageRole } from '../shared/types';

interface ConversationTreeState {
  graph: ConversationGraph | null;
  panelOpen: boolean;
  selectedNodeId: string | null;
  searchQuery: string;
  collapsed: Record<string, boolean>;
  isRefreshing: boolean;
  notice: string | null;
  roleFilter: MessageRole | 'all';
  activeOnly: boolean;
  viewMode: 'git' | 'tree';
  setGraph: (graph: ConversationGraph | null) => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleCollapsed: (nodeId: string) => void;
  setIsRefreshing: (refreshing: boolean) => void;
  setNotice: (notice: string | null) => void;
  setRoleFilter: (roleFilter: MessageRole | 'all') => void;
  setActiveOnly: (activeOnly: boolean) => void;
  setViewMode: (viewMode: 'git' | 'tree') => void;
}

export const useConversationTreeStore = create<ConversationTreeState>((set) => ({
  graph: null,
  panelOpen: false,
  selectedNodeId: null,
  searchQuery: '',
  collapsed: {},
  isRefreshing: false,
  notice: null,
  roleFilter: 'all',
  activeOnly: false,
  viewMode: 'git',
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
  setRoleFilter: (roleFilter) => set({ roleFilter }),
  setActiveOnly: (activeOnly) => set({ activeOnly }),
  setViewMode: (viewMode) => set({ viewMode }),
}));
