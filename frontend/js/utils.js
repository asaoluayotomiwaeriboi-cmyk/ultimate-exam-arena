window.UEA = { 
  formatNumber(n) {
    return Number(n || 0).toLocaleString();
  },
  setActiveNav() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.sidebar-nav a').forEach((link) => {
      const href = link.getAttribute('href');
      if (href === current) link.classList.add('active');
    });
  }
};
