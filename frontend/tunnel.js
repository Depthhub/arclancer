const SmeeClient = require('smee-client');

function startSmee() {
  const smee = new SmeeClient({
    source: 'https://smee.io/arclancer123',
    target: 'http://127.0.0.1:3000/api/telegram/deal-copilot',
    logger: console
  });

  const events = smee.start();
  
  // Set webhook
  const token = '8710485089:AAHZFalyT1PGCAS-vnG3v01xrhxXeaiNOpw';
  fetch('https://api.telegram.org/bot' + token + '/setWebhook?url=https://smee.io/arclancer123&secret_token=90608b9d6fb24c5697c7981684b2323d')
    .then(r => r.json())
    .then(res => console.log('✅ WEBHOOK MAPPED TO https://smee.io/arclancer123'));

  return events;
}

try {
  startSmee();
} catch (e) {
  console.error("Fatal error starting SMEE:", e);
  process.exit(1);
}
