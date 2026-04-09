const { spawn } = require('child_process');
const fs = require('fs');

console.log('Starting Cloudflare Tunnel...');
const p = spawn('npx.cmd', ['cloudflared', 'tunnel', '--url', 'http://localhost:3000']);

p.stderr.on('data', d => {
  const text = d.toString();
  
  const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (m) {
    const url = m[0];
    console.log('\n======================================');
    console.log('✅ CLOUDFLARE URL:', url);
    console.log('======================================\n');
    
    // Auto-update Telegram
    const token = '8710485089:AAHZFalyT1PGCAS-vnG3v01xrhxXeaiNOpw';
    const secret = '90608b9d6fb24c5697c7981684b2323d';
    const webhookUrl = `${url}/api/telegram/deal-copilot`;
    
    fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}&secret_token=${secret}`)
      .then(r => r.json())
      .then(res => {
         console.log('✅ TELEGRAM WEBHOOK MAPPED TO:', webhookUrl);
         console.log('API RESPONSE:', res);
         console.log('\n🚀 THE BOT IS NOW READY FOR MESSAGES!');
      })
      .catch(console.error);
  }
});

p.stdout.on('data', d => process.stdout.write(d));
p.on('close', code => console.log('Tunnel closed with code:', code));
p.on('error', err => console.error('Tunnel spawn error:', err));
