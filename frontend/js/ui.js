/**
 * AstraGod — UI Helpers
 * Toasts, confirm dialog, sidebar conversation list rendering, theme application.
 */

const AstraUI = (() => {
  const toastContainer = document.getElementById('toastContainer');

  function toast(message, type = 'info', duration = 3200) {
    const el = document.createElement('div');
    el.className = `toast${type !== 'info' ? ` toast--${type}` : ''}`;
    el.textContent = message;
    toastContainer.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 150ms ease';
      setTimeout(() => el.remove(), 160);
    }, duration);
  }

  // ---------------- Confirm dialog ----------------
  const confirmOverlay = document.getElementById('confirmOverlay');
  const confirmMessageEl = document.getElementById('confirmMessage');
  const confirmOkBtn = document.getElementById('confirmOkBtn');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  let confirmResolver = null;

  function confirmDialog(message) {
    confirmMessageEl.textContent = message;
    confirmOverlay.hidden = false;
    return new Promise((resolve) => {
      confirmResolver = resolve;
    });
  }

  confirmOkBtn.addEventListener('click', () => {
    confirmOverlay.hidden = true;
    if (confirmResolver) confirmResolver(true);
    confirmResolver = null;
  });
  confirmCancelBtn.addEventListener('click', () => {
    confirmOverlay.hidden = true;
    if (confirmResolver) confirmResolver(false);
    confirmResolver = null;
  });
  confirmOverlay.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) {
      confirmOverlay.hidden = true;
      if (confirmResolver) confirmResolver(false);
      confirmResolver = null;
    }
  });

  // ---------------- Theme ----------------
  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }

  // ---------------- Sidebar rendering ----------------
  const conversationListEl = document.getElementById('conversationList');

  function timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  }

  function renderConversationList(conversations, activeId, handlers) {
    conversationListEl.innerHTML = '';

    if (conversations.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'sidebar__empty';
      empty.textContent = 'No conversations yet';
      conversationListEl.appendChild(empty);
      return;
    }

    conversations.forEach((conv) => {
      const item = document.createElement('div');
      item.className = `conv-item${conv.id === activeId ? ' active' : ''}`;
      item.dataset.id = conv.id;
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.title = `${conv.title} — ${timeAgo(conv.updatedAt)}`;

      const titleEl = document.createElement('span');
      titleEl.className = 'conv-item__title';
      titleEl.textContent = conv.title || 'New Chat';

      const actions = document.createElement('div');
      actions.className = 'conv-item__actions';
      actions.innerHTML = `
        <button type="button" data-action="rename" aria-label="Rename conversation">
          <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button type="button" data-action="delete" aria-label="Delete conversation">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6h12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      `;

      item.appendChild(titleEl);
      item.appendChild(actions);

      item.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        handlers.onSelect(conv.id);
      });
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.target.closest('[data-action]')) handlers.onSelect(conv.id);
      });

      actions.querySelector('[data-action="rename"]').addEventListener('click', (e) => {
        e.stopPropagation();
        startInlineRename(titleEl, conv.id, handlers.onRename);
      });
      actions.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.stopPropagation();
        handlers.onDelete(conv.id);
      });

      conversationListEl.appendChild(item);
    });
  }

  function startInlineRename(titleEl, id, onRename) {
    const original = titleEl.textContent;
    titleEl.contentEditable = 'true';
    titleEl.focus();
    document.execCommand('selectAll', false, null);

    function finish(save) {
      titleEl.contentEditable = 'false';
      const newTitle = titleEl.textContent.trim();
      if (save && newTitle && newTitle !== original) {
        onRename(id, newTitle.slice(0, 80));
      } else {
        titleEl.textContent = original;
      }
      titleEl.removeEventListener('blur', onBlur);
      titleEl.removeEventListener('keydown', onKeydown);
    }

    function onBlur() { finish(true); }
    function onKeydown(e) {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    }

    titleEl.addEventListener('blur', onBlur);
    titleEl.addEventListener('keydown', onKeydown);
  }

  return {
    toast,
    confirmDialog,
    applyTheme,
    renderConversationList,
  };
})();
