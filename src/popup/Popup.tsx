import { useEffect, useState } from 'react';
import { MessageTypes } from '../shared/messages';
import { extractConversationIdFromUrl } from '../shared/api';
import type { ConversationGraph, ExtensionResponse } from '../shared/types';
import { LogoMark } from '../shared/LogoMark';

export function Popup() {
  const [graph, setGraph] = useState<ConversationGraph | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActiveGraph() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const conversationId = tab?.url ? extractConversationIdFromUrl(tab.url) : null;

        if (tab?.id) {
          try {
            const contentState: any = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTENT_STATE' });
            if (contentState?.graph) {
              setGraph(contentState.graph);
              setLoading(false);
              return;
            }
          } catch {
            // Content script communication might fail if tab is not ChatGPT
          }
        }

        const response: ExtensionResponse<ConversationGraph | null> = await chrome.runtime.sendMessage({
          type: MessageTypes.GetGraph,
          payload: { conversationId },
        });

        setGraph(response.data ?? null);
      } catch {
        setGraph(null);
      } finally {
        setLoading(false);
      }
    }

    void loadActiveGraph();
  }, []);

  const togglePanel = () => {
    void chrome.runtime.sendMessage({ type: MessageTypes.TogglePanel }).catch(() => undefined);
    window.close();
  };

  const refresh = () => {
    setLoading(true);
    void chrome.runtime.sendMessage({ type: MessageTypes.FetchConversation })
      .then(() => window.setTimeout(() => setLoading(false), 500));
  };

  const clearGraph = async () => {
    await chrome.runtime.sendMessage({ type: MessageTypes.ClearGraph }).catch(() => undefined);
    setGraph(null);
  };

  return (
    <main className="popup">
      <header className="popup__header">
        <div className="popup__mark">
          <LogoMark size={38} />
        </div>
        <div>
          <h1>Conversation Tree</h1>
          <p>ChatGPT 分支全景图</p>
        </div>
      </header>

      <section className="popup__status">
        <span className="popup__status-dot" data-state={graph ? 'ready' : 'idle'} />
        <div>
          <strong>{loading ? '正在读取' : graph ? graph.title : '尚未捕获到对话'}</strong>
          <span>{graph ? `${Object.keys(graph.nodes).length} 个节点 · ${graph.activePath.length} 层活跃路径` : '打开 ChatGPT 对话后自动解析'}</span>
        </div>
      </section>

      <div className="popup__actions">
        <button className="popup__primary" type="button" onClick={togglePanel}>
          {graph ? '显示 / 隐藏树' : '打开树面板'}
        </button>
      </div>

      <div className="popup__footer">
        <button className="popup__ghost" type="button" onClick={refresh}>刷新</button>
        <span className="popup__divider" />
        <button className="popup__ghost popup__danger" type="button" onClick={clearGraph}>清除缓存</button>
      </div>
    </main>
  );
}
