(async function initSidebar(){
  const path = location.pathname || '/';
  const normalize = (value) => (value || '/').replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\/$/, '') || '/';
  const publicPaths = new Set(['/', '/index.html', '/login.html', '/signup.html', '/admin-login']);
  const appPaths = new Set([
    '/dashboard.html',
    '/exam.html',
    '/subject-picker.html',
    '/performance.html',
    '/dictionary.html',
    '/syllabus.html',
    '/leaderboard.html',
    '/career.html',
    '/games.html',
    '/admin.html',
    '/admin-v2.html',
    '/admin-logs.html',
    '/about.html',
    '/settings.html',
    '/daily-challenge.html',
    '/past-questions.html',
    '/support.html',
    '/topic-wise.html',
    '/clara.html'
  ]);

  if (publicPaths.has(normalize(path)) || (!appPaths.has(path) && !appPaths.has(normalize(path)))) {
    return;
  }

  try {
    if (document.querySelector('.uea-sidebar')) return;

    const resp = await fetch('/sidebar.html');
    const html = await resp.text();
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstElementChild);
    document.body.classList.add('with-sidebar');

    const hb = document.createElement('button');
    hb.className = 'uea-hamburger';
    hb.setAttribute('aria-label', 'Open menu');
    hb.innerHTML = '☰';
    document.body.appendChild(hb);
    hb.addEventListener('click', () => {
      document.body.classList.toggle('uea-sidebar-open');
    });

    const items = Array.from(document.querySelectorAll('.uea-menu .menu-item'));
    const groups = Array.from(document.querySelectorAll('.uea-menu .menu-group'));

    items.forEach((item) => {
      const dp = item.getAttribute('data-path') || null;
      if (dp && normalize(dp) === normalize(path)) {
        item.classList.add('active');
        const group = item.closest('.menu-group');
        if (group) group.classList.add('active', 'open');
      }
      item.addEventListener('click', () => {
        const target = item.getAttribute('data-path');
        if (item.id === 'uea-logout') {
          fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
            location.href = '/login.html';
          });
          return;
        }
        if (target) location.href = target;
      });
    });

    groups.forEach((group) => {
      group.addEventListener('click', (event) => {
        if (event.target.closest('.sub-item')) return;
        group.classList.toggle('open');
      });
    });

    document.addEventListener('click', (event) => {
      if (!document.body.classList.contains('uea-sidebar-open')) return;
      if (event.target.closest('.uea-sidebar') || event.target.closest('.uea-hamburger')) return;
      document.body.classList.remove('uea-sidebar-open');
    });
  } catch (err) {
    console.error('Sidebar init failed', err);
  }
})();
