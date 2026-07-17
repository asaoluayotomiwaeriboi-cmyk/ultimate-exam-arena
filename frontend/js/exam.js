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
  const total = sessionData.session.questions.length;
  // build a compact grid palette (1..N)
  palette.innerHTML = sessionData.session.questions
    .map((q, idx) => {
      const selected = sessionData.session.answers.some((item) => item.questionId === q._id);
      return `<button class="progress-pill ${selected ? 'active' : 'unanswered'}" data-index="${idx}" aria-label="Question ${idx + 1}">${idx + 1}</button>`;
    })
    .join('');
  // attach delegated click handler
  palette.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', (e) => {
      const idx = Number(b.dataset.index);
      selectQuestion(idx);
    });
  });
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
  // update question indicator and progress
  const total = sessionData.session.questions.length || 0;
  const answeredCount = sessionData.session.answers.length || 0;
  const qNumEl = document.getElementById('question-number');
  const qIndicator = document.getElementById('q-indicator');
  const progressFill = document.getElementById('progress-fill');
  if (qNumEl) qNumEl.textContent = `Question ${activeIndex + 1} of ${total}`;
  if (qIndicator) qIndicator.textContent = `${activeIndex + 1} of ${total}`;
  if (progressFill) progressFill.style.width = `${Math.round((answeredCount / Math.max(1, total)) * 100)}%`;
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
    confirm('Are you sure? Your progress will be saved and you will exit the exam.')
  ) {
    localStorage.removeItem('currentSessionId');
    window.location.href = '/dashboard.html';
  }
});
const quitTopBtn = document.getElementById('quit-top-btn');
quitTopBtn?.addEventListener('click', () => {
  if (confirm('Are you sure? Your progress will be saved and you will exit the exam.')) {
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
const calcFloat = document.getElementById('calc-float');
calcFloat?.addEventListener('click', () => calcPopup.classList.toggle('hidden'));

// Calculator logic (safe-ish: validate characters before evaluating)
const calcDisplay = document.getElementById('calc-display');
window.calcInput = (value) => {
  if (!calcDisplay) return;
  if (value === 'C') {
    calcDisplay.value = '';
    return;
  }
  if (value === '=') {
    try {
      const expr = (calcDisplay.value || '0').trim();
      if (!/^[0-9+\-×x*÷/.()\s]+$/.test(expr)) throw new Error('Invalid expression');
      // Normalize ×/÷ to * and /
      const safeExpr = expr.replace(/×|x/g, '*').replace(/÷/g, '/');
      // Basic validation: only allowed chars
      if (!/^[0-9+\-*/().\s]+$/.test(safeExpr)) throw new Error('Invalid expression');
      // Evaluate using Function after validation
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + safeExpr + ')')();
      calcDisplay.value = String(result);
    } catch (e) {
      calcDisplay.value = 'Error';
    }
    return;
  }
  calcDisplay.value = calcDisplay.value === '0' && value !== '.' ? value : calcDisplay.value + value;
};

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
