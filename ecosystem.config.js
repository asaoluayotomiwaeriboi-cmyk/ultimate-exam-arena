module.exports = {
  apps: [
    {
      name: 'ultimate-exam-arena',
      script: 'backend/server.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '0.0.0.0'
      }
    }
  ]
};
