// sidebar.js - toggle and active state
document.addEventListener('DOMContentLoaded',()=>{
  const ham = document.querySelector('.hamburger');
  const sidebar = document.querySelector('.sidebar');
  if(ham && sidebar){
    ham.addEventListener('click',()=> sidebar.classList.toggle('open'))
  }
  // mark active links
  const links = document.querySelectorAll('.sidebar a');
  links.forEach(a=>{ if(a.href === location.href || a.getAttribute('href')===location.pathname.split('/').pop()){ a.classList.add('active') } })
});
