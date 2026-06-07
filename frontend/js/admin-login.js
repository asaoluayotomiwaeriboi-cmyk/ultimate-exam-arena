const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const MAX_ATTEMPTS = 5;
const ATTEMPT_KEY = 'admin_login_attempts';
const LOCKOUT_KEY = 'admin_login_lockout';

document.getElementById('admin-form').addEventListener('submit', handleAdminLogin);

async function handleAdminLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const accessCode = document.getElementById('access-code').value;
  const messageEl = document.getElementById('auth-message');

  // Check if locked out
  const lockoutTime = localStorage.getItem(LOCKOUT_KEY);
  if (lockoutTime) {
    const now = Date.now();
    if (now < parseInt(lockoutTime)) {
      const remainingMin = Math.ceil((parseInt(lockoutTime) - now) / 60000);
      messageEl.textContent = `Too many failed attempts. Try again in ${remainingMin} minutes.`;
      return;
    } else {
      localStorage.removeItem(LOCKOUT_KEY);
      localStorage.removeItem(ATTEMPT_KEY);
    }
  }

  try {
    const response = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, accessCode })
    });

    const data = await response.json();

    if (data.success) {
      localStorage.removeItem(ATTEMPT_KEY);
      localStorage.removeItem(LOCKOUT_KEY);
      messageEl.style.color = '#10b981';
      messageEl.textContent = 'Login successful! Redirecting...';
      setTimeout(() => {
        window.location.href = '/admin-v2.html';
      }, 1000);
    } else {
      // Increment attempt counter
      let attempts = parseInt(localStorage.getItem(ATTEMPT_KEY) || '0') + 1;
      localStorage.setItem(ATTEMPT_KEY, attempts.toString());

      if (attempts >= MAX_ATTEMPTS) {
        localStorage.setItem(LOCKOUT_KEY, (Date.now() + LOCKOUT_DURATION).toString());
        messageEl.textContent = 'Too many failed attempts. Account locked for 30 minutes.';
      } else {
        const remaining = MAX_ATTEMPTS - attempts;
        messageEl.textContent = `${data.message} (${remaining} attempts remaining)`;
      }
    }
  } catch (error) {
    messageEl.textContent = 'Login error. Please try again.';
  }
}
