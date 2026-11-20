module.exports = [
  {
    script: 'dist/server/index.js',
    name: 'ff-send',
    // Socket.IO 使用单进程内存适配器，禁止 cluster（与旧版实际跑 1 实例行为一致）
    exec_mode: 'fork',
    instances: 1,
    cwd: __dirname,
    env: {
      NODE_ENV: 'production',
    },
    env_production: {
      NODE_ENV: 'production',
    },
  },
];
