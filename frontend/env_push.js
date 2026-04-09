const { spawn } = require('child_process');

async function setEnv(key, value) {
  return new Promise((resolve, reject) => {
    console.log(`Adding ${key}...`);
    const p = spawn('npx.cmd', ['vercel', 'env', 'add', key, 'production'], { shell: true });
    
    let out = '';
    p.stdout.on('data', (d) => {
      const str = d.toString();
      out += str;
      if (str.includes('sensitive?')) {
        p.stdin.write('y\n');
      }
      if (str.includes('value of')) {
        p.stdin.write(value + '\n');
      }
    });
    
    p.on('close', (code) => {
        console.log(`Finished ${key}`);
        resolve();
    });
  });
}

async function run() {
  // IMPORTANT: Replace placeholder values with your actual secrets before running.
  // NEVER commit real secrets to version control.
  await setEnv('UPSTASH_REDIS_REST_TOKEN', process.env.UPSTASH_REDIS_REST_TOKEN || 'YOUR_TOKEN_HERE');
  await setEnv('UPSTASH_REDIS_REST_URL', process.env.UPSTASH_REDIS_REST_URL || 'YOUR_URL_HERE');
  await setEnv('TELEGRAM_BOT_TOKEN', process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TOKEN_HERE');
  await setEnv('TELEGRAM_WEBHOOK_SECRET', process.env.TELEGRAM_WEBHOOK_SECRET || 'YOUR_SECRET_HERE');
  await setEnv('WALLET_ENCRYPTION_SECRET', process.env.WALLET_ENCRYPTION_SECRET || 'YOUR_SECRET_HERE');
  await setEnv('GROQ_API_KEY', process.env.GROQ_API_KEY || 'YOUR_KEY_HERE');
  console.log('All done!');
}

run();
