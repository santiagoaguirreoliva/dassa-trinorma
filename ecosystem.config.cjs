module.exports = {
  apps: [{
    name: 'dassa-sgi',
    cwd: '/home/dassa/dassa4/apps/sgi',
    script: 'server/index.js',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '300M',
    restart_delay: 3000,
    time: true,
  }]
};
