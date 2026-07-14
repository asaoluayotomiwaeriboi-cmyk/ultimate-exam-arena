/* global selectQuestion */
const sessionId = new URLSearchParams(window.location.search).get('sessionId');
const token = localStorage.getItem('token') || localStorage.getItem('cbt_token');
const questionTitle = document.querySelector('#question-title');
const optionsContainer = document.querySelector('#options-container');
const palette = document.querySelector('#question-palette');
const timerLabel = document.querySelector('#timer-label');
const prevBtn = document.querySelector('#prev-btn');
const nextBtn = document.querySelector('#next-btn');
const quitBtn = document.querySelector('#quit-btn');
const finishBtn = document.querySelector('#finish-btn');
const fullscreenBtn = document.querySelector('#fullscreen-btn');
const warningBanner = document.querySelector('#warning-banner');
const scoreTracker = document.querySelector('#score-tracker');
const calcToggle = document.querySelector('#calc-toggle');
const calcPopup = document.querySelector('#calculator-popup');
const calcClose = document.querySelector('#calc-close');

if (!token) window.location.href = '/login.html';
if (!sessionId) window.location.href = '/dashboard.html';

const request = async (path, options = {}) => {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` }, ...options });
  const data = await res.json();
  if (!data.success) window.location.href = '/dashboard.html';
  return data;
};

let sessionData = null;
let activeIndex = 0;
let timer = null;
let remainingSeconds = 0;
let warnings = 0;

const renderPalette = () => {
  palette.innerHTML = sessionData.session.questions
    .map((q, idx) => {
      const selected = sessionData.session.answers.some((item) => item.questionId === q._id);
      return `<button class="progress-pill ${selected ? 'active' : 'unanswered'}" onclick="selectQuestion(${idx})">${idx + 1}</button>`;
    })
    .join('');
};

const renderQuestion = () => {
  const question = sessionData.session.questions[activeIndex];
  questionTitle.textContent = `${activeIndex + 1}. ${question.questionText}`;
  const answered = sessionData.session.answers.find(
    (item) => item.questionId === question._id
  )?.answer;
  // Escape choice text to prevent XSS
  optionsContainer.innerHTML = question.choices
    .map((choice) => {
      const active = answered === choice ? 'active' : '';
      return `<div class="option ${active}" data-choice="${encodeURIComponent(choice)}" data-question="${question._id}">${window.escapeHtml ? window.escapeHtml(choice) : choice}</div>`;
    })
    .join('');
  scoreTracker.textContent = `${sessionData.session.answers.length} / ${sessionData.session.questions.length} answered`;
};

window.selectQuestion = (index) => {
  activeIndex = index;
  renderQuestion();
};

optionsContainer?.addEventListener('click', async (event) => {
  const target = event.target.closest('.option');
  if (!target) return;
  const choice = decodeURIComponent(target.dataset.choice || '');
  const questionId = target.dataset.question;
  try {
    await request('/api/exams/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, questionId, answer: choice }),
    });
    const existing = sessionData.session.answers.find((item) => item.questionId === questionId);
    if (existing) existing.answer = choice;
    else sessionData.session.answers.push({ questionId, answer: choice });
    renderPalette();
    renderQuestion();
  } catch (error) {
    alert('Could not save answer');
  }
});

const updateTimer = () => {
  if (remainingSeconds <= 0) return submitTest();
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const seconds = String(remainingSeconds % 60).padStart(2, '0');
  timerLabel.textContent = `${minutes}:${seconds}`;
  remainingSeconds -= 1;
};

const submitTest = async () => {
  clearInterval(timer);
  const data = await request('/api/exams/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (data.success) {
    window.location.href = '/dashboard.html';
  }
};

const loadSession = async () => {
  const data = await request(`/api/exams/session/${sessionId}`);
  sessionData = data;
  if (data.expired) {
    alert('Time expired. Your exam will be submitted.');
    return submitTest();
  }
  remainingSeconds = Math.max(
    0,
    Math.round((new Date(sessionData.session.expiresAt) - new Date()) / 1000)
  );
  renderPalette();
  renderQuestion();
  timerLabel.textContent = '00:00';
  timer = setInterval(updateTimer, 1000);
};

prevBtn?.addEventListener('click', () => {
  if (activeIndex > 0) selectQuestion(activeIndex - 1);
});
nextBtn?.addEventListener('click', () => {
  if (activeIndex < sessionData.session.questions.length - 1) selectQuestion(activeIndex + 1);
});
quitBtn?.addEventListener('click', () => {
  if (
    confirm(
      'Are you sure you want to quit this exam? Your progress will be saved but exam will not be completed.'
    )
  ) {
    localStorage.removeItem('currentSessionId');
    window.location.href = '/dashboard.html';
  }
});
finishBtn?.addEventListener('click', () => {
  if (confirm('Submit exam now?')) submitTest();
});
fullscreenBtn?.addEventListener('click', () => {
  document.documentElement.requestFullscreen?.();
});
calcToggle?.addEventListener('click', () => calcPopup.classList.toggle('hidden'));
calcClose?.addEventListener('click', () => calcPopup.classList.add('hidden'));

// Keyboard shortcuts
window.addEventListener('keydown', (event) => {
  // Prevent keyboard shortcuts when typing in input fields
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

  // N for Next question
  if (event.key.toLowerCase() === 'n' && activeIndex < sessionData.session.questions.length - 1) {
    selectQuestion(activeIndex + 1);
  }
  // P for Previous question
  else if (event.key.toLowerCase() === 'p' && activeIndex > 0) {
    selectQuestion(activeIndex - 1);
  }
  // S for Submit exam
  else if (event.key.toLowerCase() === 's') {
    if (confirm('Submit exam now?')) submitTest();
  }
  // Q for Quit exam
  else if (event.key.toLowerCase() === 'q') {
    if (confirm('Are you sure you want to quit this exam?')) {
      localStorage.removeItem('currentSessionId');
      window.location.href = '/dashboard.html';
    }
  }
  // C for Calculator toggle
  else if (event.key.toLowerCase() === 'c') {
    calcPopup.classList.toggle('hidden');
  }
  // F for Fullscreen
  else if (event.key.toLowerCase() === 'f') {
    document.documentElement.requestFullscreen?.();
  }
});

window.addEventListener('visibilitychange', async () => {
  if (document.hidden) {
    warnings += 1;
    warningBanner.textContent = `Tab warning ${warnings}: Stay focused during the exam.`;
    warningBanner.classList.remove('hidden');
    setTimeout(() => warningBanner.classList.add('hidden'), 4200);
  }
});

loadSession();
