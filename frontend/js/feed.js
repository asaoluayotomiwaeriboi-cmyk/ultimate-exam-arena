// feed.js - minimal feed loading stub
document.addEventListener('DOMContentLoaded',()=>{
  const feed = document.getElementById('feed-list');
  if(!feed) return;
  for(let i=1;i<=5;i++){
    const item = document.createElement('div'); item.className='feed-item card hoverable';
    item.innerHTML = `<div style="flex:1"><strong>Update ${i}</strong><p class="meta">Short update summary for the feed item ${i}.</p></div>`;
    feed.appendChild(item);
  }
});
