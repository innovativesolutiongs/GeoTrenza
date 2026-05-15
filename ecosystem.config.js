module.exports = {
  apps: [
    {
      name: 'geotrenza-ingestion',
      script: 'backend/ingestion/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      },
      env_development: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
      },
      error_file: 'logs/ingestion-error.log',
      out_file: 'logs/ingestion-out.log',
      merge_logs: true,
      time: true,
      kill_timeout: 5000,
    },
  ],
};
