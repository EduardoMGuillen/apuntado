/** @deprecated Usar Fly.io en producción (`npm run deploy`). Solo para desarrollo local con PM2. */
module.exports = {
  apps: [
    {
      name: "apuntado-vps",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
