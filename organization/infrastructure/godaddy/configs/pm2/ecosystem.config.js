/**
 * PM2 Ecosystem Configuration for Broxiva
 * GoDaddy VPS Deployment
 */

module.exports = {
  apps: [
    // Backend API (NestJS)
    {
      name: 'broxiva-api',
      cwd: '/opt/broxiva/backend',
      script: 'dist/main.js',
      instances: 'max', // Use all available CPUs
      exec_mode: 'cluster',

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      env_file: '/opt/broxiva/backend/.env',

      // Memory management
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/broxiva/backend/error.log',
      out_file: '/var/log/broxiva/backend/out.log',
      merge_logs: true,

      // Process management
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 4000,

      // Graceful shutdown
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,
      shutdown_with_message: true,

      // Exponential backoff restart delay
      exp_backoff_restart_delay: 100,

      // Cron restart (optional - restart at 3 AM daily)
      // cron_restart: '0 3 * * *',

      // Source map support
      source_map_support: true,
    },

    // Frontend Web (Next.js Standalone)
    {
      name: 'broxiva-web',
      cwd: '/opt/broxiva/frontend',
      script: 'server.js',
      instances: 2, // 2 instances for frontend
      exec_mode: 'cluster',

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      env_file: '/opt/broxiva/frontend/.env',

      // Memory management
      max_memory_restart: '512M',
      node_args: '--max-old-space-size=512',

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/broxiva/frontend/error.log',
      out_file: '/var/log/broxiva/frontend/out.log',
      merge_logs: true,

      // Process management
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 4000,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
    },
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'broxiva',
      host: ['production-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:broxiva/organization.git',
      path: '/opt/broxiva/source',
      'pre-deploy-local': '',
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
  },
};
