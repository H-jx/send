module.exports = [
  {
    script: 'dist/server/app.js',
    name: 'ff-send',
    exec_mode: 'cluster',
    instances: 1,
    instance_var: "INSTANCE_ID",
    cwd: __dirname,
    env: {
      "NODE_ENV": "production"
    },
    env_production : {
      "NODE_ENV": "production"
    },
  }
];
