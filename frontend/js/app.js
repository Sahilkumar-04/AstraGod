/**
 * AstraGod — App Entry Point
 * Wires together storage, chat, ui, and settings modules and binds all
 * top-level DOM event listeners.
 */

(() => {
  const appEl = document.getElementById('app');

  // ---------- Sidebar elements ----------
  const newChatBtn = document.getElementById('newChatBtn');
  const searchInput = document.getElementById('searchConversations');
  const openSidebarBtn = document.getElementById('openSidebarBtn');
  const collapseSidebarBtn = document.getElementById('collapseSidebarBtn');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const exportDataBtn = document.getElementById('exportDataBtn');
  const importFileInput = document.getElementById('importFileInput');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  // ---------- Composer elements ----------
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('sendBtn');
  const suggestionGrid = document.getElementById('suggestionGrid');

  let searchQuery = '';

  // ---------------- Sidebar list refresh ----------------
  function refreshConversationList() {
    let conversations = AstraStorage.getConversations()
      .slice()
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      conversations = conversations.filter((c) => c.title.toLowerCase().includes(q));
    }

    AstraUI.renderConversationList(conversations, AstraChat.getActiveConversationId(), {
      onSelect: (id) => {
        AstraChat.loadConversation(id);
        closeMobileSidebar();
        refreshConversationList();
      },
      onRename: (id, newTitle) => {
        const conv = AstraStorage.getConversation(id);
        if (!conv) return;
        conv.title = newTitle;
        AstraStorage.upsertConversation(conv);
        if (id === AstraChat.getActiveConversationId()) {
          document.getElementById('currentChatTitle').textContent = newTitle;
        }
        refreshConversationList();
      },
      onDelete: async (id) => {
        const ok = await AstraUI.confirmDialog('Delete this conversation? This cannot be undone.');
        if (!ok) return;
        AstraStorage.deleteConversation(id);
        if (id === AstraChat.getActiveConversationId()) {
          const remaining = AstraStorage.getConversations();
          if (remaining.length > 0) {
            AstraChat.loadConversation(remaining[0].id);
          } else {
            AstraChat.startNewConversation();
          }
        }
        refreshConversationList();
        AstraUI.toast('Conversation deleted', 'success');
      },
    });
  }

  document.addEventListener('astra:conversations-changed', refreshConversationList);

  // ---------------- New chat ----------------
  newChatBtn.addEventListener('click', () => {
    AstraChat.startNewConversation();
    refreshConversationList();
    closeMobileSidebar();
    chatInput.focus();
  });

  // ---------------- Search ----------------
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    refreshConversationList();
  });

  // ---------------- Sidebar collapse / mobile drawer ----------------
  function closeMobileSidebar() {
    appEl.classList.remove('sidebar-open');
  }

  collapseSidebarBtn.addEventListener('click', () => {
    appEl.classList.toggle('sidebar-collapsed');
  });

  openSidebarBtn.addEventListener('click', () => {
    appEl.classList.add('sidebar-open');
  });

  sidebarOverlay.addEventListener('click', closeMobileSidebar);

  // ---------------- Export ----------------
  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleExport() {
    downloadJSON(AstraStorage.exportAll(), 'astragod-chat-history.json');
    AstraUI.toast('Chat history exported', 'success');
  }
  exportDataBtn.addEventListener('click', handleExport);

  // ---------------- Import ----------------
  function handleImportFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!AstraStorage.validateImportPayload(data)) {
          throw new Error('This file is not a valid AstraGod export.');
        }
        AstraStorage.importAll(data, { merge: true });
        refreshConversationList();
        AstraUI.toast('Chat history imported', 'success');
      } catch (err) {
        AstraUI.toast(err.message || 'Failed to import file', 'error');
      }
    };
    reader.onerror = () => AstraUI.toast('Could not read the selected file', 'error');
    reader.readAsText(file);
  }
  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImportFile(file);
    importFileInput.value = '';
  });

  // ---------------- Clear history ----------------
  async function handleClearHistory() {
    const ok = await AstraUI.confirmDialog('Clear all conversations? This cannot be undone.');
    if (!ok) return;
    AstraStorage.clearAllConversations();
    AstraChat.startNewConversation();
    refreshConversationList();
    AstraSettings.close();
    AstraUI.toast('History cleared', 'success');
  }
  clearHistoryBtn.addEventListener('click', handleClearHistory);

  // ---------------- Settings module ----------------
  AstraSettings.init({
    onChange: () => refreshConversationList(),
    onClear: handleClearHistory,
    onImportData: handleImportFile,
  });

  // ---------------- Composer ----------------
  function autoResizeTextarea() {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 200)}px`;
  }

  function handleSend() {
    const text = chatInput.value;
    if (!text.trim()) return;
    chatInput.value = '';
    autoResizeTextarea();
    AstraChat.sendUserMessage(text);
  }

  sendBtn.addEventListener('click', handleSend);

  chatInput.addEventListener('input', autoResizeTextarea);

  chatInput.addEventListener('keydown', (e) => {
    const settings = AstraStorage.getSettings();
    if (e.key === 'Enter' && !e.shiftKey && settings.enterToSend) {
      e.preventDefault();
      handleSend();
    }
  });

  // ---------------- Suggestion cards ----------------
  suggestionGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.suggestion-card');
    if (!card) return;
    chatInput.value = card.dataset.prompt.replace(/\\n/g, '\n');
    chatInput.focus();
    autoResizeTextarea();
    const len = chatInput.value.length;
    chatInput.setSelectionRange(len, len);
  });

  // ---------------- Theme toggle button (quick switch) ----------------
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  themeToggleBtn.addEventListener('click', () => {
    const settings = AstraStorage.getSettings();
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    AstraUI.applyTheme(next);
    AstraStorage.saveSettings({ ...settings, theme: next });
  });

  // ---------------- Init ----------------
  AstraChat.init();
  refreshConversationList();
})();
