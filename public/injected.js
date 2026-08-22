(() => {
  const SOURCE = 'chatgpt-conversation-tree';
  const INSTRUMENTED_KEY = '__ctreeInstrumented';
  const nonce = document.currentScript?.dataset?.ctreeNonce ?? '';

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
        nonce,
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

  window.fetch = async function patchedFetch(input, init) {
    const response = await originalFetch.apply(this, arguments);
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input?.url;

    if (isConversationApiUrl(url)) {
      readJson(response).then((result) => {
        if (result) {
          captureResponse(url, result.status, result.body);
        }
      });
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

})();
