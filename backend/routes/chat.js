/**
 * AstraGod — Chat Route
 * POST /api/chat
 */

const express = require('express');
const { getChatCompletion, AIServiceError } = require('../services/aiService');
const { validateChatRequest } = require('../middleware/validate');

const router = express.Router();

const SYSTEM_PROMPT =
  'You are AstraGod, an intelligent, helpful, and precise AI assistant. ' +
  'Give clear, well-structured answers. Use Markdown and fenced code blocks ' +
  '(with a language tag) whenever you share code.';

router.post('/chat', validateChatRequest, async (req, res, next) => {
  try {
    const { messages, temperature, maxTokens } = req.body;

    const reply = await getChatCompletion(messages, {
      temperature: temperature !== undefined ? Number(temperature) : 0.7,
      maxTokens: maxTokens !== undefined ? Number(maxTokens) : 1024,
      systemPrompt: SYSTEM_PROMPT,
    });

    res.status(200).json({
      reply,
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof AIServiceError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    }
    next(err);
  }
});

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    configured: Boolean(process.env.AI_API_KEY && process.env.AI_API_URL),
    model: process.env.AI_MODEL || 'gpt-4o-mini',
  });
});

module.exports = router;
