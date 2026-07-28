module.exports = {
    apps: [
        {
            name: 'bsinfobot',
            script: 'index.js',
            cwd: __dirname,
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            time: true,
            env: {
                NODE_ENV: 'production',
                TZ: 'Asia/Seoul',
            },
        },
    ],
}
