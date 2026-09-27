/**
 * AstraGod — Frontend API Client
 * Talks only to our own backend (/api/chat). No AI provider keys ever
 * touch the browser.
 */

const AstraAPI = (() => {
  const BASE_URL = ''; // same-origin; backend serves the frontend too

  class APIError extends Error {
    constructor(message, code = 'UNKNOWN_ERROR', status = 0) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }

  /**
   * Sends the conversation to the backend and returns the assistant's
   * reply text. Supports cancellation via AbortController.
   */
  async function sendChat(messages, { temperature, maxTokens, signal } = {}) {
    let response;
    try {
      response = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, temperature, maxTokens }),
        signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new APIError('Generation stopped.', 'ABORTED', 0);
      }
      throw new APIError(
        'Could not reach AstraGod. Check your connection and that the server is running.',
        'NETWORK_ERROR',
        0
      );
    }

    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      /* non-JSON response */
    }

    if (!response.ok) {
      const message =
        (data && data.error && data.error.message) ||
        "AstraGod couldn't complete that request. Please try again.";
      const code = (data && data.error && data.error.code) || 'SERVER_ERROR';
      throw new APIError(message, code, response.status);
    }

    if (!data || typeof data.reply !== 'string') {
      throw new APIError('Received an invalid response from AstraGod.', 'INVALID_RESPONSE', response.status);
    }

    return data.reply;
  }

  return { sendChat, APIError };
})();
