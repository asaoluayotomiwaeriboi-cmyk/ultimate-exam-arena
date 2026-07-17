const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const MAX_ATTEMPTS = 5;
const ATTEMPT_KEY = 'admin_login_attempts';
const LOCKOUT_KEY = 'admin_login_lockout';

const messageEl = document.getElementById('auth-message');
const lockoutTimerEl = document.getElementById('lockout-timer');

document.getElementById('admin-form').addEventListener('submit', handleAdminLogin);

// show/hide password toggle
const toggleBtn = document.getElementById('toggle-admin-password');
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    const input = document.getElementById('password');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      toggleBtn.textContent = 'Hide';
    } else {
      input.type = 'password';
      toggleBtn.textContent = 'Show';
    }
  });
}

let lockoutInterval = null;
function startLockoutCountdown(untilTs) {
  clearInterval(lockoutInterval);
  const update = () => {
    const now = Date.now();
    const rem = untilTs - now;
    if (rem <= 0) {
      clearInterval(lockoutInterval);
      localStorage.removeItem(LOCKOUT_KEY);
      localStorage.removeItem(ATTEMPT_KEY);
      if (lockoutTimerEl) lockoutTimerEl.textContent = '';
      return;
    }
    const mins = Math.floor(rem / 60000);
    const secs = Math.floor((rem % 60000) / 1000);
    if (lockoutTimerEl) lockoutTimerEl.textContent = `Locked. Try again in ${mins}m ${secs}s`;
  };
  update();
  lockoutInterval = setInterval(update, 1000);
}

// initialize if localStorage has lock
const existingLock = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
if (existingLock && existingLock > Date.now()) startLockoutCountdown(existingLock);

async function handleAdminLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const accessCode = document.getElementById('access-code').value;

  // Check if locked out (local)
  const lockoutTime = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
  if (lockoutTime && Date.now() < lockoutTime) {
    messageEl.textContent = 'Too many failed attempts. Please wait.';
    startLockoutCountdown(lockoutTime);
    return;
  }

  try {
    const response = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, accessCode }),
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
      return;
    }

    // Handle server-side lockout
    if (response.status === 429 || data.lockedUntil) {
      const until = data.lockedUntil ? parseInt(data.lockedUntil, 10) : Date.now() + LOCKOUT_DURATION;
      localStorage.setItem(LOCKOUT_KEY, until.toString());
      startLockoutCountdown(until);
      messageEl.textContent = 'Too many failed attempts. Account locked.';
      return;
    }

    // increment local attempts
    let attempts = parseInt(localStorage.getItem(ATTEMPT_KEY) || '0', 10) + 1;
    localStorage.setItem(ATTEMPT_KEY, attempts.toString());

    if (attempts >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_DURATION;
      localStorage.setItem(LOCKOUT_KEY, until.toString());
      startLockoutCountdown(until);
      messageEl.textContent = 'Too many failed attempts. Account locked for 30 minutes.';
    } else {
      const remaining = MAX_ATTEMPTS - attempts;
      messageEl.textContent = `${data.message || 'Invalid credentials'} (${remaining} attempts remaining)`;
    }
  } catch (error) {
    messageEl.textContent = 'Login error. Please try again.';
  }
}
