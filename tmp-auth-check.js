const http = require('http');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: 5002,
        path,
        method,
        headers: data ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        } : {}
      },
      (res) => {
        let out = '';
        res.on('data', (chunk) => (out += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: out }));
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const signup = await request('POST', '/api/auth/signup', {
    name: 'Live Verify',
    email: 'verify-roundtrip@example.com',
    phone: '08000000000',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    dob: '2000-01-01',
    state: 'Lagos',
    school: 'Test School'
  });
  console.log('SIGNUP_STATUS', signup.status);
  console.log(signup.body);

  const login = await request('POST', '/api/auth/login', {
    email: 'verify-roundtrip@example.com',
    password: 'Password123!'
  });
  console.log('LOGIN_STATUS', login.status);
  console.log(login.body);
})();
