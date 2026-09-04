// exam.js - simple option selection and navigation stub
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.option-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    })
  })
});
