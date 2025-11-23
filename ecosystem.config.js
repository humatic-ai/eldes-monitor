module.exports = {
  apps: [{
    name: 'eldes-monitor',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3600',
    cwd: '/home/bitnami/eldes',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PATH: '/opt/bitnami/node/bin:/usr/local/bin:/usr/bin:/bin'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    merge_logs: true,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};

