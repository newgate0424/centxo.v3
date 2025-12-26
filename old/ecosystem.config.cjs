module.exports = {
  apps: [
    {
      name: "nextjs",
      cwd: "C:/Users/ADMINSER/Documents/GitHub/forads",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
