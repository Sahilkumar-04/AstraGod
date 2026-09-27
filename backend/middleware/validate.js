/**
 * AstraGod — Request Validation Middleware
 */

const MAX_MESSAGE_LENGTH = 8000;
const MAX_HISTORY_LENGTH = 40;

function validateChatRequest(req, res, next) {
  const { messages, temperature, maxTokens } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'Request must include a non-empty "messages" array.',
      },
    });
  }

  if (messages.length > MAX_HISTORY_LENGTH) {
    return res.status(400).json({
      error: {
        code: 'HISTORY_TOO_LONG',
        message: `Conversation history exceeds the maximum of ${MAX_HISTORY_LENGTH} messages.`,
      },
    });
  }

  for (const msg of messages) {
    if (!msg || typeof msg.content !== 'string' || !msg.content.trim()) {
      return res.status(400).json({
        error: {
          code: 'EMPTY_MESSAGE',
          message: 'Messages cannot be empty.',
        },
      });
    }
    if (msg.content.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: {
          code: 'MESSAGE_TOO_LONG',
          message: `Messages must be under ${MAX_MESSAGE_LENGTH} characters.`,
        },
      });
    }
    if (!['user', 'assistant'].includes(msg.role)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ROLE',
          message: 'Each message must have role "user" or "assistant".',
        },
      });
    }
  }

  if (temperature !== undefined) {
    const t = Number(temperature);
    if (Number.isNaN(t) || t < 0 || t > 2) {
      return res.status(400).json({
        error: { code: 'INVALID_TEMPERATURE', message: 'Temperature must be between 0 and 2.' },
      });
    }
  }

  if (maxTokens !== undefined) {
    const m = Number(maxTokens);
    if (Number.isNaN(m) || m < 1 || m > 4096) {
      return res.status(400).json({
        error: { code: 'INVALID_MAX_TOKENS', message: 'maxTokens must be between 1 and 4096.' },
      });
    }
  }

  next();
}

module.exports = { validateChatRequest };
