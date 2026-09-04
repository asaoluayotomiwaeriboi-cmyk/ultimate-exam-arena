// navbar.js - minimal hamburger toggle
document.addEventListener('DOMContentLoaded',()=>{
  const btn = document.querySelector('.hamburger');
  const links = document.querySelector('.nav-links');
  if(btn && links){
    btn.addEventListener('click',()=>{
      links.classList.toggle('open');
      if(links.classList.contains('open')){links.style.display='flex'}else{links.style.display='none'}
    })
  }
});
