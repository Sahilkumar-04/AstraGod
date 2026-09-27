/**
 * AstraGod — Chat Module
 * Owns the active conversation, message rendering, and streaming/sending
 * of requests to the backend.
 */

const AstraChat = (() => {
  const welcomeScreen = document.getElementById('welcomeScreen');
  const messagesContainer = document.getElementById('messagesContainer');
  const currentChatTitle = document.getElementById('currentChatTitle');
  const chatSection = document.getElementById('chatSection');

  const sendBtn = document.getElementById('sendBtn');
  const stopBtn = document.getElementById('stopBtn');
  const chatInput = document.getElementById('chat-input');

  let activeConversation = null;
  let abortController = null;
  let isGenerating = false;

  function generateTitleFromMessage(text) {
    const clean = text.trim().replace(/\s+/g, ' ');
    return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean || 'New Chat';
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function setGenerating(state) {
    isGenerating = state;
    sendBtn.hidden = state;
    stopBtn.hidden = !state;
    chatInput.disabled = state;
  }

  function showWelcome() {
    welcomeScreen.hidden = false;
    messagesContainer.hidden = true;
    messagesContainer.innerHTML = '';
    currentChatTitle.textContent = 'AstraGod';
  }

  function showMessages() {
    welcomeScreen.hidden = true;
    messagesContainer.hidden = false;
  }

  function scrollToBottom() {
    chatSection.scrollTop = chatSection.scrollHeight;
  }

  function buildMessageEl(role, content, timestamp) {
    const showTimestamps = AstraStorage.getSettings().showTimestamps;
    const wrap = document.createElement('div');
    wrap.className = `msg msg--${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'msg__avatar';
    avatar.textContent = role === 'user' ? 'S' : '';
    if (role === 'assistant') {
      avatar.innerHTML = '<svg viewBox="0 0 48 48" width="16" height="16"><path fill="#fff" d="M24 2 L29 18 L45 24 L29 30 L24 46 L19 30 L3 24 L19 18 Z"/></svg>';
    }

    const body = document.createElement('div');
    body.className = 'msg__body';

    const meta = document.createElement('div');
    meta.className = 'msg__meta';
    meta.innerHTML = `<span class="msg__name">${role === 'user' ? 'You' : 'AstraGod'}</span>${
      showTimestamps ? `<span class="msg__time">${formatTime(timestamp)}</span>` : ''
    }`;

    const contentEl = document.createElement('div');
    contentEl.className = 'msg__content';
    contentEl.innerHTML = AstraMarkdown.render(content);

    body.appendChild(meta);
    body.appendChild(contentEl);

    if (role === 'assistant') {
      const actions = document.createElement('div');
      actions.className = 'msg__actions';
      actions.innerHTML = `
        <button type="button" class="msg__action-btn" data-action="copy">
          <svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15V5a2 2 0 012-2h10" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          Copy
        </button>
        <button type="button" class="msg__action-btn" data-action="regenerate">
          <svg viewBox="0 0 24 24"><path d="M4 4v5h5M20 20v-5h-5M4.5 9a8 8 0 0113.9-3.5L20 8M19.5 15a8 8 0 01-13.9 3.5L4 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Regenerate
        </button>
      `;
      actions.querySelector('[data-action="copy"]').addEventListener('click', () => {
        navigator.clipboard.writeText(content).then(() => AstraUI.toast('Copied to clipboard', 'success'));
      });
      actions.querySelector('[data-action="regenerate"]').addEventListener('click', () => regenerateLast());
      body.appendChild(actions);
    }

    wrap.appendChild(avatar);
    wrap.appendChild(body);

    contentEl.querySelectorAll('[data-action="copy-code"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = btn.closest('.code-block').querySelector('code').innerText;
        navigator.clipboard.writeText(code).then(() => {
          const label = btn.querySelector('span');
          const original = label.textContent;
          label.textContent = 'Copied!';
          setTimeout(() => { label.textContent = original; }, 1500);
        });
      });
    });

    return wrap;
  }

  function renderAllMessages() {
    messagesContainer.innerHTML = '';
    activeConversation.messages.forEach((m) => {
      messagesContainer.appendChild(buildMessageEl(m.role, m.content, m.timestamp));
    });
    scrollToBottom();
  }

  function appendMessage(role, content, timestamp = new Date().toISOString()) {
    activeConversation.messages.push({ role, content, timestamp });
    messagesContainer.appendChild(buildMessageEl(role, content, timestamp));
    scrollToBottom();
  }

  function showTypingIndicator() {
    const wrap = document.createElement('div');
    wrap.className = 'msg msg--assistant';
    wrap.id = 'typingIndicatorMsg';
    wrap.innerHTML = `
      <div class="msg__avatar"><svg viewBox="0 0 48 48" width="16" height="16"><path fill="#fff" d="M24 2 L29 18 L45 24 L29 30 L24 46 L19 30 L3 24 L19 18 Z"/></svg></div>
      <div class="msg__body">
        <div class="msg__meta"><span class="msg__name">AstraGod</span></div>
        <div class="typing-indicator"><span></span><span></span><span></span></div>
      </div>
    `;
    messagesContainer.appendChild(wrap);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    document.getElementById('typingIndicatorMsg')?.remove();
  }

  function showErrorBanner(message) {
    const wrap = document.createElement('div');
    wrap.className = 'msg msg--assistant';
    wrap.innerHTML = `
      <div class="msg__avatar"><svg viewBox="0 0 48 48" width="16" height="16"><path fill="#fff" d="M24 2 L29 18 L45 24 L29 30 L24 46 L19 30 L3 24 L19 18 Z"/></svg></div>
      <div class="msg__body">
        <div class="error-banner">
          <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <span>${AstraMarkdown.escapeHtml(message)}</span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(wrap);
    scrollToBottom();
  }

  async function requestAssistantReply() {
    setGenerating(true);
    showTypingIndicator();
    abortController = new AbortController();

    const settings = AstraStorage.getSettings();
    const historyPayload = activeConversation.messages
      .slice(-40)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const reply = await AstraAPI.sendChat(historyPayload, {
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        signal: abortController.signal,
      });
      removeTypingIndicator();
      appendMessage('assistant', reply);
      persistActiveConversation();
    } catch (err) {
      removeTypingIndicator();
      if (err.code === 'ABORTED') {
        AstraUI.toast('Generation stopped', 'info');
      } else {
        showErrorBanner(err.message || "AstraGod couldn't complete that request. Please try again.");
        AstraUI.toast(err.message || 'Something went wrong', 'error');
      }
    } finally {
      setGenerating(false);
      abortController = null;
    }
  }

  function persistActiveConversation() {
    activeConversation.updatedAt = new Date().toISOString();
    AstraStorage.upsertConversation(activeConversation);
  }

  async function sendUserMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;

    if (!activeConversation) {
      startNewConversation(false);
    }

    const isFirstMessage = activeConversation.messages.length === 0;
    showMessages();
    appendMessage('user', trimmed);

    if (isFirstMessage) {
      activeConversation.title = generateTitleFromMessage(trimmed);
      currentChatTitle.textContent = activeConversation.title;
    }

    persistActiveConversation();
    document.dispatchEvent(new CustomEvent('astra:conversations-changed'));

    await requestAssistantReply();
    document.dispatchEvent(new CustomEvent('astra:conversations-changed'));
  }

  function regenerateLast() {
    if (isGenerating || !activeConversation) return;
    // Remove the last assistant message (and its DOM node) before re-asking.
    const messages = activeConversation.messages;
    if (messages.length === 0) return;
    if (messages[messages.length - 1].role === 'assistant') {
      messages.pop();
      const lastMsgEl = messagesContainer.lastElementChild;
      if (lastMsgEl) lastMsgEl.remove();
    }
    persistActiveConversation();
    requestAssistantReply().then(() => {
      document.dispatchEvent(new CustomEvent('astra:conversations-changed'));
    });
  }

  function stopGenerating() {
    if (abortController) abortController.abort();
  }

  function startNewConversation(render = true) {
    activeConversation = AstraStorage.createConversation();
    AstraStorage.upsertConversation(activeConversation);
    if (render) {
      showWelcome();
      document.dispatchEvent(new CustomEvent('astra:conversations-changed'));
    }
    return activeConversation;
  }

  function loadConversation(id) {
    const conv = AstraStorage.getConversation(id);
    if (!conv) return;
    activeConversation = conv;
    if (conv.messages.length === 0) {
      showWelcome();
    } else {
      showMessages();
      currentChatTitle.textContent = conv.title;
      renderAllMessages();
    }
  }

  function getActiveConversationId() {
    return activeConversation ? activeConversation.id : null;
  }

  function init() {
    const conversations = AstraStorage.getConversations();
    if (conversations.length > 0) {
      loadConversation(conversations[0].id);
    } else {
      startNewConversation(true);
    }

    stopBtn.addEventListener('click', stopGenerating);
  }

  return {
    init,
    sendUserMessage,
    startNewConversation,
    loadConversation,
    getActiveConversationId,
    stopGenerating,
  };
})();
