const authForm = document.querySelector('#auth-form');
const authMessage = document.querySelector('#auth-message');
const togglePasswordBtns = document.querySelectorAll('#toggle-password');
const pwBar = document.getElementById('pw-bar');
const pwText = document.getElementById('pw-text');

const getToken = () => localStorage.getItem('cbt_token');
const saveToken = (token) => localStorage.setItem('cbt_token', token);
const saveRole = (role) => localStorage.setItem('cbt_role', role);
const getRole = () => localStorage.getItem('cbt_role');

const redirectIfLoggedIn = () => {
  const token = getToken();
  const role = getRole();
  if (!token) return;
  const destination = role === 'admin' ? '/admin.html' : '/dashboard.html';
  const current = window.location.pathname;
  if (current.endsWith('login.html') || current.endsWith('signup.html') || current === '/') {
    window.location.href = destination;
  }
};

redirectIfLoggedIn();

const showMessage = (message, type = 'success') => {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.className = type === 'error' ? 'error' : 'success';
  setTimeout(() => {
    authMessage.textContent = '';
    authMessage.className = '';
  }, 4200);
};

const setLoading = (btn, isLoading) => {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? 'Please wait...' : btn.dataset.orig || btn.textContent;
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const scorePassword = (pw) => {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return score; // 0..4
};

const updatePwStrength = (pw) => {
  if (!pwBar) return;
  const score = scorePassword(pw);
  const pct = Math.round((score / 4) * 100);
  pwBar.innerHTML = `<div style="width:${pct}%"></div>`;
  if (pwText) {
    const labels = ['Very weak', 'Weak', 'Okay', 'Good', 'Strong'];
    pwText.textContent = labels[score];
    pwText.className = score < 2 ? 'pw-text' : 'pw-text success';
  }
};

const handleSubmit = async (event) => {
  event.preventDefault();
  if (!authForm) return;
  const mode = authForm.dataset.mode;
  const submitBtn = document.getElementById('submit-btn');
  const email = authForm.querySelector('#email')?.value?.trim();
  const password = authForm.querySelector('#password')?.value || '';

  // Basic validation
  if (!email || !validateEmail(email)) return showMessage('Please enter a valid email', 'error');

  if (mode === 'signup') {
    const name = authForm.querySelector('#name')?.value?.trim();
    const phone = authForm.querySelector('#phone')?.value?.trim();
    const confirm = authForm.querySelector('#confirm-password')?.value || '';
    const state = authForm.querySelector('#state')?.value || '';
    const agree = authForm.querySelector('#agree')?.checked;
    if (!name) return showMessage('Full name is required', 'error');
    if (!phone) return showMessage('Phone number is required', 'error');
    if (!password || password.length < 8) return showMessage('Password must be at least 8 characters', 'error');
    if (password !== confirm) return showMessage('Passwords do not match', 'error');
    if (!state) return showMessage('Please select your state', 'error');
    if (!agree) return showMessage('You must agree to the terms', 'error');
  } else {
    if (!password) return showMessage('Password is required', 'error');
  }

  const route = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
  const payload = { email, password };
  if (mode === 'signup') {
    payload.name = authForm.querySelector('#name')?.value?.trim();
    payload.phone = authForm.querySelector('#phone')?.value?.trim();
    payload.state = authForm.querySelector('#state')?.value || '';
    payload.school = authForm.querySelector('#school')?.value?.trim() || '';
    payload.dateOfBirth = authForm.querySelector('#dob')?.value || null;
    payload.confirmPassword = authForm.querySelector('#confirm-password')?.value || '';
  }

  try {
    if (submitBtn) {
      submitBtn.dataset.orig = submitBtn.textContent;
      setLoading(submitBtn, true);
    }
    const response = await fetch(route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Authentication failed');
    saveToken(data.token);
    saveRole(data.user.role);
    showMessage('Success! Redirecting...', 'success');
    window.location.href = data.user.role === 'admin' ? '/admin.html' : '/dashboard.html';
  } catch (err) {
    showMessage(err.message || 'Unknown error', 'error');
  } finally {
    if (submitBtn) setLoading(submitBtn, false);
  }
};

// wire up password toggles
togglePasswordBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = btn.closest('.password-row')?.querySelector('input');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = 'Hide';
    } else {
      input.type = 'password';
      btn.textContent = 'Show';
    }
  });
});

// password strength live update
const passwordInput = document.querySelector('#password');
if (passwordInput) {
  passwordInput.addEventListener('input', (e) => updatePwStrength(e.target.value));
}

if (authForm) {
  authForm.addEventListener('submit', handleSubmit);
}
