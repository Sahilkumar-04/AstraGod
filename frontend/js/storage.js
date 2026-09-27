/**
 * AstraGod — Storage Module
 * Handles all localStorage persistence: conversations + settings.
 */

const AstraStorage = (() => {
  const CONVERSATIONS_KEY = 'astragod:conversations';
  const SETTINGS_KEY = 'astragod:settings';

  const DEFAULT_SETTINGS = {
    theme: 'dark', // 'dark' | 'light' | 'system'
    enterToSend: true,
    showTimestamps: true,
    animations: true,
    temperature: 0.7,
    maxTokens: 1024,
  };

  function safeParse(json, fallback) {
    try {
      const parsed = JSON.parse(json);
      return parsed ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function getConversations() {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    const list = safeParse(raw, []);
    return Array.isArray(list) ? list : [];
  }

  function saveConversations(conversations) {
    try {
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
      return true;
    } catch (err) {
      console.error('[AstraGod] Failed to save conversations:', err);
      return false;
    }
  }

  function getConversation(id) {
    return getConversations().find((c) => c.id === id) || null;
  }

  function upsertConversation(conversation) {
    const conversations = getConversations();
    const idx = conversations.findIndex((c) => c.id === conversation.id);
    if (idx === -1) {
      conversations.unshift(conversation);
    } else {
      conversations[idx] = conversation;
    }
    saveConversations(conversations);
    return conversation;
  }

  function deleteConversation(id) {
    const conversations = getConversations().filter((c) => c.id !== id);
    saveConversations(conversations);
  }

  function clearAllConversations() {
    saveConversations([]);
  }

  function createConversation() {
    const now = new Date().toISOString();
    return {
      id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: 'New Chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  function getSettings() {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...safeParse(raw, {}) };
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function exportAll() {
    return {
      app: 'AstraGod',
      exportedAt: new Date().toISOString(),
      version: 1,
      conversations: getConversations(),
      settings: getSettings(),
    };
  }

  function validateImportPayload(data) {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.conversations)) return false;
    return data.conversations.every(
      (c) =>
        c &&
        typeof c.id === 'string' &&
        typeof c.title === 'string' &&
        Array.isArray(c.messages)
    );
  }

  function importAll(data, { merge = true } = {}) {
    if (!validateImportPayload(data)) {
      throw new Error('Invalid AstraGod export file.');
    }
    const incoming = data.conversations;
    if (merge) {
      const existing = getConversations();
      const existingIds = new Set(existing.map((c) => c.id));
      const merged = [
        ...incoming.filter((c) => !existingIds.has(c.id)),
        ...existing,
      ];
      saveConversations(merged);
    } else {
      saveConversations(incoming);
    }
    if (data.settings && typeof data.settings === 'object') {
      saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    }
  }

  return {
    DEFAULT_SETTINGS,
    getConversations,
    saveConversations,
    getConversation,
    upsertConversation,
    deleteConversation,
    clearAllConversations,
    createConversation,
    getSettings,
    saveSettings,
    exportAll,
    importAll,
    validateImportPayload,
  };
})();
