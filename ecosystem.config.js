module.exports = {
  apps: [
    {
      name: 'yabudu-api',
      script: './var/www/ya_budu/ya_budu/server.js',
      cwd: '.',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        FRONTPAD_URL: 'http://localhost:3005'
      }
    },
    {
      name: 'younitipad',
      script: './var/www/ya_budu/ya_budu/frontpad/server/src/index.js',
      cwd: '.',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        FRONTPAD_PORT: 3005
      }
    }
  ]
};
