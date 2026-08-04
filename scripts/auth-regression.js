const baseUrl = process.env.AUTH_BASE_URL || 'http://127.0.0.1:5002';

async function signupWithFrontendPayload() {
  const payload = {
    name: 'Regression User',
    email: 'regression@example.com',
    phone: '08012345678',
    dateOfBirth: '2000-01-01',
    address: '',
    city: '',
    lga: '',
    state: 'Lagos',
    school: 'Test School',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const response = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log(JSON.stringify({ status: response.status, data }, null, 2));
  if (!response.ok || !data.success) {
    process.exitCode = 1;
  }
}

signupWithFrontendPayload().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
