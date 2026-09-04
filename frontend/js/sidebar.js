document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const sidebar = document.querySelector('.sidebar');
  const nav = document.querySelector('.topbar nav');

  if (toggle) {
    toggle.addEventListener('click', () => {
      if (sidebar) sidebar.classList.toggle('open');
      if (nav) nav.classList.toggle('open');
    });
  }

  document.querySelectorAll('.sidebar-nav a').forEach((link) => {
    if (link.href === window.location.href || link.getAttribute('href') === window.location.pathname.split('/').pop()) {
      link.classList.add('active');
    }
  });
});
