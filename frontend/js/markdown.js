/**
 * AstraGod — Markdown Rendering Module
 * Wraps marked.js + highlight.js with sanitization and code-block UI.
 */

const AstraMarkdown = (() => {
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Very small sanitizer: strips script/style/iframe/object/embed tags and
   * inline event-handler attributes / javascript: URLs from rendered HTML.
   * marked.js escapes raw HTML input by default when configured below, so
   * this is a defense-in-depth pass over the HTML *it* produces.
   */
  function sanitize(html) {
    const template = document.createElement('template');
    template.innerHTML = html;

    const disallowedTags = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'form'];
    disallowedTags.forEach((tag) => {
      template.content.querySelectorAll(tag).forEach((el) => el.remove());
    });

    const all = template.content.querySelectorAll('*');
    all.forEach((el) => {
      [...el.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value.trim().toLowerCase();
        if (name.startsWith('on')) el.removeAttribute(attr.name);
        if ((name === 'href' || name === 'src') && value.startsWith('javascript:')) {
          el.removeAttribute(attr.name);
        }
      });
      if (el.tagName === 'A') {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
    });

    return template.innerHTML;
  }

  let configured = false;
  function configureMarked() {
    if (configured || typeof marked === 'undefined') return;
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
    configured = true;
  }

  function highlightAll(container) {
    if (typeof hljs === 'undefined') return;
    container.querySelectorAll('pre code').forEach((block) => {
      try {
        hljs.highlightElement(block);
      } catch (_) {
        /* ignore highlight failures on malformed code */
      }
    });
  }

  /**
   * Renders markdown to a sanitized HTML string, then post-processes
   * <pre><code> blocks into AstraGod's code-block UI (header + copy button).
   */
  function render(markdownText) {
    configureMarked();

    let html;
    if (typeof marked !== 'undefined') {
      html = marked.parse(markdownText || '');
    } else {
      // Fallback if the CDN failed to load: escape + linebreaks only.
      html = `<p>${escapeHtml(markdownText || '').replace(/\n/g, '<br>')}</p>`;
    }

    html = sanitize(html);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    wrapper.querySelectorAll('pre').forEach((pre) => {
      const codeEl = pre.querySelector('code');
      const langMatch = codeEl && codeEl.className.match(/language-(\w+)/);
      const lang = langMatch ? langMatch[1] : 'text';

      const block = document.createElement('div');
      block.className = 'code-block';

      const header = document.createElement('div');
      header.className = 'code-block__header';
      header.innerHTML = `
        <span class="code-block__lang">${escapeHtml(lang)}</span>
        <button type="button" class="code-block__copy" data-action="copy-code">
          <svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15V5a2 2 0 012-2h10" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          <span>Copy</span>
        </button>
      `;

      pre.replaceWith(block);
      block.appendChild(header);
      block.appendChild(pre);
    });

    highlightAll(wrapper);

    return wrapper.innerHTML;
  }

  return { render, escapeHtml };
})();
