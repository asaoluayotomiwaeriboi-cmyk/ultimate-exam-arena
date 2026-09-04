// auth.js - basic form toggles and placeholders
document.addEventListener('DOMContentLoaded',()=>{
  const toggle = document.getElementById('toggle-password');
  if(toggle){
    toggle.addEventListener('click',()=>{
      const pwd = document.querySelector('input[type="password"]');
      if(pwd){pwd.type = pwd.type === 'password' ? 'text' : 'password'}
    })
  }
});
