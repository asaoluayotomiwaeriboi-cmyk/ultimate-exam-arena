const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 5000,
  path: '/health',
  method: 'GET',
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('OK');
    process.exit(0);
  } else {
    console.log('NOT OK');
    process.exit(1);
  }
});

req.on('error', () => {
  console.log('NOT OK');
  process.exit(1);
});

req.end();
