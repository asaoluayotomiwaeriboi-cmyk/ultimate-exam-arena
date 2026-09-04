document.addEventListener('DOMContentLoaded', () => {
  const timerEl = document.getElementById('exam-timer');
  const cells = document.querySelectorAll('.question-cell');
  const options = document.querySelectorAll('.option-btn');
  const progressBar = document.querySelector('.progress-bar');

  if (timerEl) {
    let timeLeft = 35 * 60;
    setInterval(() => {
      const mins = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      timeLeft = Math.max(0, timeLeft - 1);
    }, 1000);
  }

  cells.forEach((cell) => {
    cell.addEventListener('click', () => {
      cells.forEach((c) => c.classList.remove('active'));
      cell.classList.add('active');
    });
  });

  options.forEach((option) => {
    option.addEventListener('click', () => {
      options.forEach((opt) => opt.classList.remove('selected'));
      option.classList.add('selected');
      if (progressBar) {
        const current = Number(progressBar.dataset.current || 0);
        progressBar.style.width = `${Math.min(100, current + 10)}%`;
        progressBar.dataset.current = Math.min(100, current + 10);
      }
    });
  });
});
