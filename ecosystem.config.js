module.exports = {
  apps: [
    {
      name: 'aria-backend',
      script: 'venv/bin/python3.11',
      args: '-m uvicorn simple_main:app --host 0.0.0.0 --port 8000',
      cwd: '/home/ubuntu/Aria---Document-Management-Employee/backend',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'aria-frontend',
      script: 'npm',
      args: 'run start -- -p 12001 -H 0.0.0.0',
      cwd: '/home/ubuntu/Aria---Document-Management-Employee/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 12001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};