const { spawn } = require('child_process');

console.log('Starting Smee.io tunnel...');
const p = spawn('smee.cmd', ['-u', 'https://smee.io/arclancer123', '-p', '3000', '-P', '/api/telegram/deal-copilot']);

p.stdout.on('data', d => process.stdout.write(d));
p.stderr.on('data', d => process.stderr.write(d));

setTimeout(() => {
  const token = '8710485089:AAHZFalyT1PGCAS-vnG3v01xrhxXeaiNOpw';
  fetch('https://api.telegram.org/bot' + token + '/setWebhook?url=https://smee.io/arclancer123&secret_token=90608b9d6fb24c5697c7981684b2323d')
    .then(r=>r.json())
    .then(z=>console.log('✅ WEBHOOK BOUND TO LOCAL TUNNEL:', z));
}, 2000);
