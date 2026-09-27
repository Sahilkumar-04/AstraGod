/**
 * AstraGod — AI Service Layer
 * ------------------------------------------------------------
 * Provider-independent abstraction over any chat-completion API.
 * Swap providers by changing AI_API_URL / AI_MODEL / the request
 * builder + response parser below — nothing else in the app needs
 * to change.
 * ------------------------------------------------------------
 */

const fetch = require('node-fetch');

const AI_API_KEY = process.env.AI_API_KEY;
const AI_API_URL = process.env.AI_API_URL;
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Detects which provider "shape" to speak based on the configured URL.
 * This keeps the service provider-independent: add a new branch here
 * to support a new API without touching routes or the frontend.
 */
function detectProvider(url = '') {
  if (url.includes('anthropic.com')) return 'anthropic';
  if (url.includes('openai.com')) return 'openai';
  return 'openai-compatible'; // most self-hosted / OpenRouter / Groq / etc. follow this shape
}

/**
 * Normalizes AstraGod's internal message format into the shape the
 * target provider expects.
 * Internal format: [{ role: 'user' | 'assistant', content: string }]
 */
function buildRequestBody(provider, messages, options) {
  const { temperature = 0.7, maxTokens = 1024, systemPrompt } = options;

  if (provider === 'anthropic') {
    return {
      model: AI_MODEL,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };
  }

  // openai / openai-compatible
  const body = {
    model: AI_MODEL,
    temperature,
    max_tokens: maxTokens,
    messages: systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages,
  };
  return body;
}

function buildHeaders(provider) {
  if (provider === 'anthropic') {
    return {
      'Content-Type': 'application/json',
      'x-api-key': AI_API_KEY,
      'anthropic-version': '2023-06-01',
    };
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${AI_API_KEY}`,
  };
}

/**
 * Extracts plain text from a provider-specific response payload.
 */
function extractReplyText(provider, data) {
  if (provider === 'anthropic') {
    const block = Array.isArray(data.content)
      ? data.content.find((c) => c.type === 'text')
      : null;
    return block ? block.text : '';
  }
  // openai / openai-compatible
  const choice = data.choices && data.choices[0];
  return choice && choice.message ? choice.message.content : '';
}

class AIServiceError extends Error {
  constructor(message, status = 502, code = 'AI_PROVIDER_ERROR') {
    super(message);
    this.name = 'AIServiceError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Sends a conversation to the configured AI provider and returns the
 * assistant's reply as plain text.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {{temperature?: number, maxTokens?: number, systemPrompt?: string}} options
 */
async function getChatCompletion(messages, options = {}) {
  if (!AI_API_KEY || !AI_API_URL) {
    throw new AIServiceError(
      'AstraGod is not configured. Set AI_API_KEY and AI_API_URL in your .env file.',
      500,
      'MISSING_CONFIG'
    );
  }

  const provider = detectProvider(AI_API_URL);
  const body = buildRequestBody(provider, messages, options);
  const headers = buildHeaders(provider);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(AI_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AIServiceError('The AI provider took too long to respond.', 504, 'TIMEOUT');
    }
    throw new AIServiceError('Could not reach the AI provider.', 502, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 429) {
    throw new AIServiceError('The AI provider is rate-limiting requests. Please wait a moment.', 429, 'RATE_LIMITED');
  }

  if (!response.ok) {
    let detail = '';
    try {
      const errJson = await response.json();
      detail = errJson.error?.message || errJson.message || '';
    } catch (_) {
      /* ignore parse failure */
    }
    throw new AIServiceError(
      detail || `AI provider responded with status ${response.status}.`,
      502,
      'PROVIDER_ERROR'
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (_) {
    throw new AIServiceError('Received an invalid response from the AI provider.', 502, 'INVALID_RESPONSE');
  }

  const text = extractReplyText(provider, data);
  if (!text) {
    throw new AIServiceError('The AI provider returned an empty response.', 502, 'EMPTY_RESPONSE');
  }

  return text;
}

module.exports = { getChatCompletion, AIServiceError };
