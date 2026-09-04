// chat.js - placeholder for Clara chat interactions
document.addEventListener('DOMContentLoaded',()=>{
  const form = document.getElementById('chat-form');
  if(!form) return;
  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    const input = form.querySelector('input[name="q"]');
    if(!input || !input.value) return;
    const list = document.getElementById('chat-history');
    const li = document.createElement('div'); li.className='card'; li.textContent = input.value; list.prepend(li);
    input.value='';
  })
});
