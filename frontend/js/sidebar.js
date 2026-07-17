(async function initSidebar(){
  try{
    const resp = await fetch('/sidebar.html');
    const html = await resp.text();
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstElementChild);
    document.body.classList.add('with-sidebar');

    // Add hamburger for mobile
    const hb = document.createElement('button');
    hb.className = 'uea-hamburger';
    hb.setAttribute('aria-label','Open menu');
    hb.innerHTML = '☰';
    document.body.appendChild(hb);
    hb.addEventListener('click', ()=>{
      document.body.classList.toggle('uea-sidebar-open');
    });

    const items = Array.from(document.querySelectorAll('.uea-menu .menu-item'));
    const path = location.pathname || '/';
    const normalize = p => p.endsWith('/') ? p.slice(0,-1) : p;
    items.forEach(item=>{
      const dp = item.getAttribute('data-path') || null;
      if (dp && normalize(dp) === normalize(path)) item.classList.add('active');
      item.addEventListener('click', ()=>{
        const target = item.getAttribute('data-path');
        if (item.id === 'uea-logout'){
          fetch('/api/auth/logout',{method:'POST'}).finally(()=>location.href='/login.html');
          return;
        }
        if (target) location.href = target;
      });
    });

    // close sidebar when clicking outside on mobile
    document.addEventListener('click', (e)=>{
      if (!document.body.classList.contains('uea-sidebar-open')) return;
      if (e.target.closest('.uea-sidebar') || e.target.closest('.uea-hamburger')) return;
      document.body.classList.remove('uea-sidebar-open');
    });
  }catch(err){
    // fail silently — sidebar is optional
    console.error('Sidebar init failed', err);
  }
})();
