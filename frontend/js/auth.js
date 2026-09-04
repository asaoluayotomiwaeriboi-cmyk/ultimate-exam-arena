document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('form');
  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      if (button) {
        const original = button.textContent;
        button.textContent = 'Processing...';
        button.disabled = true;
        setTimeout(() => {
          button.textContent = original;
          button.disabled = false;
        }, 800);
      }
    });
  });
});
