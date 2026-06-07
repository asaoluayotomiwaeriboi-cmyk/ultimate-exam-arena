const authForm = document.querySelector('#auth-form');
const authTitle = document.querySelector('#auth-title');
const toggleAuth = document.querySelector('#toggle-auth');
const authMessage = document.querySelector('#auth-message');
const adminCodeGroup = document.querySelector('#admin-code-group');
const mfaSection = document.querySelector('#mfa-section');
const qrCodeImg = document.querySelector('#qr-code');
const mfaTokenInput = document.querySelector('#mfa-token');

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
  authMessage.textContent = message;
  authMessage.className = type === 'error' ? 'flash' : 'flash';
  setTimeout(() => { authMessage.textContent = ''; authMessage.className = ''; }, 4200);
};

const handleSubmit = async (event) => {
  event.preventDefault();
  const mode = authForm.dataset.mode;
  const name = authForm.querySelector('#name')?.value?.trim();
  const email = authForm.querySelector('#email').value.trim();
  const password = authForm.querySelector('#password').value.trim();
  const adminCode = authForm.querySelector('#admin-code')?.value?.trim();
  const mfaToken = mfaTokenInput?.value?.trim();
  const route = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
  const payload = { email, password, ...(mode === 'signup' ? { name } : {}), ...(adminCode ? { adminCode } : {}), ...(mfaToken ? { mfaToken } : {}) };

  try {
    const response = await fetch(route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!data.success) {
      if (data.mfaRequired) {
        mfaSection.style.display = 'block';
        qrCodeImg.src = data.qrCode;
        showMessage('MFA required. Scan QR code and enter token.');
        return;
      }
      throw new Error(data.message || 'Authentication failed');
    }
    saveToken(data.token);
    saveRole(data.user.role);
    showMessage('Welcome back! Redirecting...');
    window.location.href = data.user.role === 'admin' ? '/admin.html' : '/dashboard.html';
  } catch (error) {
    showMessage(error.message, 'error');
  }
};

const setMode = (mode) => {
  authForm.dataset.mode = mode;
  authTitle.textContent = mode === 'login' ? 'Student Login' : 'Create a student account';
  authForm.querySelector('.name-field').style.display = mode === 'login' ? 'none' : 'block';
  if (adminCodeGroup) adminCodeGroup.style.display = mode === 'login' ? 'block' : 'none';
  toggleAuth.textContent = mode === 'login' ? 'Don’t have an account? Sign up' : 'Already have an account? Login';
};

const switchMode = () => setMode(authForm.dataset.mode === 'login' ? 'signup' : 'login');

if (authForm) {
  authForm.addEventListener('submit', handleSubmit);
  toggleAuth?.addEventListener('click', switchMode);
  setMode(authForm.dataset.mode || 'login');
}
