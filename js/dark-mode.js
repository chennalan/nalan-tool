(() => {
  const KEY = 'nalan-tool-theme';
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (_) {}
  const initial = saved === 'dark' || saved === 'light' ? saved :
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.dataset.theme = initial;
  root.style.colorScheme = initial;
  const mount = () => {
    if (document.getElementById('nt-theme-toggle')) return;
    const button = document.createElement('button');
    button.id = 'nt-theme-toggle';
    button.type = 'button';
    button.setAttribute('aria-label', '切换深色模式');
    button.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
    button.innerHTML = '<span aria-hidden="true" class="nt-theme-icon"></span><span class="nt-theme-label"></span>';
    const update = () => {
      const dark = root.dataset.theme === 'dark';
      button.querySelector('.nt-theme-icon').textContent = dark ? '☀️' : '🌙';
      button.querySelector('.nt-theme-label').textContent = dark ? '浅色模式' : '深色模式';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? '切换浅色模式' : '切换深色模式');
      root.style.colorScheme = dark ? 'dark' : 'light';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#0b1120' : '#f8fafc');
    };
    button.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem(KEY, next); } catch (_) {}
      update();
    });
    document.body.appendChild(button);
    update();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();