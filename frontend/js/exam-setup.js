// exam-setup.js - simple subject selection and proceed
document.addEventListener('DOMContentLoaded',()=>{
  const proceed = document.getElementById('proceed-test');
  if(proceed){
    proceed.addEventListener('click',()=>{
      // basic validation stub
      window.location.href='exam.html';
    })
  }
});
