import { useEffect, useState } from 'react';
import { MessageTypes } from '../shared/messages';
import type { ConversationGraph, ExtensionResponse } from '../shared/types';

export function Popup() {
  const [graph, setGraph] = useState<ConversationGraph | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void chrome.runtime.sendMessage({ type: MessageTypes.GetGraph })
      .then((response: ExtensionResponse<ConversationGraph | null>) => {
        setGraph(response.data ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
            <circle cx="12" cy="5" r="2.4" fill="currentColor" />
            <circle cx="5" cy="18" r="2.4" fill="currentColor" />
            <circle cx="19" cy="18" r="2.4" fill="currentColor" />
            <path d="M12 7.5v4.1M12 7.5 6.5 15.8M12 7.5l5.5 8.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
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
        <button className="popup__secondary" type="button" onClick={refresh}>刷新</button>
      </div>

      <button className="popup__clear" type="button" onClick={clearGraph}>清除当前对话缓存</button>
    </main>
  );
}
