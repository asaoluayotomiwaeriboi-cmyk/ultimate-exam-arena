(async function initSidebar(){
  const path = location.pathname || '/';
  const normalize = (value) => (value || '/').replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\/$/, '') || '/';
  const allowedPaths = new Set([
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
  const hasAuthToken = Boolean(localStorage.getItem('token') || localStorage.getItem('cbt_token'));

  if (!hasAuthToken && !allowedPaths.has(path) && normalize(path) !== '') {
    return;
  }

  if (!hasAuthToken && !allowedPaths.has(path)) {
    return;
  }

  try {
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
    items.forEach((item) => {
      const dp = item.getAttribute('data-path') || null;
      if (dp && normalize(dp) === normalize(path)) item.classList.add('active');
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

    document.addEventListener('click', (e) => {
      if (!document.body.classList.contains('uea-sidebar-open')) return;
      if (e.target.closest('.uea-sidebar') || e.target.closest('.uea-hamburger')) return;
      document.body.classList.remove('uea-sidebar-open');
    });
  } catch (err) {
    console.error('Sidebar init failed', err);
  }
})();
