(() => {
  const SOURCE = 'chatgpt-conversation-tree';
  const INSTRUMENTED_KEY = '__ctreeInstrumented';

  if (window[INSTRUMENTED_KEY]) {
    return;
  }

  window[INSTRUMENTED_KEY] = true;

  const isConversationApiUrl = (url) => {
    if (typeof url !== 'string') {
      return false;
    }

    return /\/backend-api\/conversation(\/|\?|$)/i.test(url) && !/\/backend-api\/conversations\//i.test(url);
  };

  const send = (payload) => {
    window.postMessage(
      {
        source: SOURCE,
        type: 'API_RESPONSE',
        payload,
      },
      '*',
    );
  };

  const captureResponse = (url, status, body) => {
    if (!isConversationApiUrl(url) || !body) {
      return;
    }

    send({
      url,
      status,
      body,
      capturedAt: Date.now(),
    });
  };

  const readJson = (response) => {
    try {
      return response.clone().json().then((body) => ({ status: response.status, body }));
    } catch (error) {
      return Promise.resolve(null);
    }
  };

  const originalFetch = window.fetch;
  let cachedAuthHeaders = {};

  const extractAuthHeaders = (input, init) => {
    try {
      const headers = init?.headers;
      if (headers) {
        if (headers instanceof Headers) {
          const auth = headers.get('authorization');
          if (auth) cachedAuthHeaders['Authorization'] = auth;
          const oaiDevice = headers.get('oai-device-id');
          if (oaiDevice) cachedAuthHeaders['OAI-Device-Id'] = oaiDevice;
        } else if (typeof headers === 'object') {
          const auth = headers['authorization'] || headers['Authorization'];
          if (auth) cachedAuthHeaders['Authorization'] = auth;
          const oaiDevice = headers['oai-device-id'] || headers['OAI-Device-Id'];
          if (oaiDevice) cachedAuthHeaders['OAI-Device-Id'] = oaiDevice;
        }
      }
    } catch {
      // Ignore header extract error
    }
  };

  const extractConvId = (url) => {
    const match = url?.match(/\/(?:c|conversation)\/([a-zA-Z0-9_-]+)/i);
    return match?.[1] ?? null;
  };

  const handleSseStream = async (response) => {
    try {
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';
      let convId = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.conversation_id) {
                convId = data.conversation_id;
              }
            } catch {
              // Ignore partial chunk
            }
          }
        }
      }

      // Stream completed! Refetch full updated conversation tree immediately
      const targetId = convId || extractConvId(window.location.href);
      if (targetId) {
        setTimeout(() => {
          void window.__ctreeFetchConversation(targetId);
        }, 120);
      }
    } catch {
      // Ignore stream errors
    }
  };

  window.fetch = async function patchedFetch(input, init) {
    extractAuthHeaders(input, init);
    const response = await originalFetch.apply(this, arguments);
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input?.url;

    if (isConversationApiUrl(url)) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        // SSE Streaming response for new messages / replies
        void handleSseStream(response.clone());
      } else {
        readJson(response).then((result) => {
          if (result) {
            captureResponse(url, result.status, result.body);
          }
        });
      }
    }

    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
    this.__ctreeUrl = typeof url === 'string' ? url : url?.toString?.() ?? '';
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function patchedSend(...args) {
    this.addEventListener('load', () => {
      const url = this.__ctreeUrl || this.responseURL || '';
      if (!isConversationApiUrl(url)) {
        return;
      }

      try {
        const body = JSON.parse(this.responseText);
        captureResponse(url, this.status, body);
      } catch (error) {
        // Ignore non-JSON responses.
      }
    });

    return originalSend.apply(this, args);
  };

  window.__ctreeFetchConversation = async (conversationId) => {
    try {
      // Ensure we have active auth token
      if (!cachedAuthHeaders['Authorization']) {
        try {
          const sessionRes = await originalFetch('/api/auth/session', { credentials: 'include' });
          if (sessionRes.ok) {
            const session = await sessionRes.json();
            if (session?.accessToken) {
              cachedAuthHeaders['Authorization'] = `Bearer ${session.accessToken}`;
            }
          }
        } catch {
          // Ignore session fetch error
        }
      }

      const response = await originalFetch(`/backend-api/conversation/${conversationId}`, {
        credentials: 'include',
        headers: {
          accept: 'application/json',
          ...cachedAuthHeaders,
        },
      });

      if (!response.ok) {
        return null;
      }

      const body = await response.json();
      captureResponse(`/backend-api/conversation/${conversationId}`, response.status, body);
      return body;
    } catch (error) {
      return null;
    }
  };

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || typeof event.data !== 'object') {
      return;
    }

    if (event.data?.source === 'ctree-content' && event.data?.type === 'FETCH_CONVERSATION' && event.data?.conversationId) {
      void window.__ctreeFetchConversation(event.data.conversationId);
    }
  });
})();
