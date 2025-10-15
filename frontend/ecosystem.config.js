module.exports = {
  apps: [{
    name: 'aria-frontend',
    script: 'npm',
    args: 'run start -- -p 3000 -H 0.0.0.0',
    cwd: '/home/ubuntu/Aria---Document-Management-Employee/frontend',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }, {
    name: 'aria-frontend-dev',
    script: 'npm',
    args: 'run dev -- -p 12001 -H 0.0.0.0',
    cwd: '/home/ubuntu/Aria---Document-Management-Employee/frontend',
    env: {
      NODE_ENV: 'development',
      PORT: 12001
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
