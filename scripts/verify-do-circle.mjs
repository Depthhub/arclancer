/**
 * Report whether Circle PW secrets are present on the DigitalOcean frontend service.
 * Usage: DO_TOKEN=... node scripts/verify-do-circle.mjs
 */
const token = process.env.DO_TOKEN || process.env.DIGITALOCEAN_ACCESS_TOKEN;
const appId = process.env.DO_APP_ID || '23e82931-1bab-41e2-8fd8-40a2ee2fe074';

if (!token) {
  console.error('Set DO_TOKEN or DIGITALOCEAN_ACCESS_TOKEN');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}` };

const { app } = await fetch(`https://api.digitalocean.com/v2/apps/${appId}`, { headers }).then((r) =>
  r.json()
);

const frontend = app?.spec?.services?.find((s) => s.name === 'frontend');
if (!frontend) {
  console.error('frontend service not found');
  process.exit(1);
}

const envMap = new Map((frontend.envs ?? []).map((e) => [e.key, e]));

function report(key) {
  const entry = envMap.get(key);
  if (!entry) return `${key}: missing`;
  if (entry.type === 'SECRET') {
    return `${key}: SECRET (${entry.scope ?? 'RUN_TIME'}) — set value in DO dashboard if login fails`;
  }
  return `${key}: ${entry.value} (${entry.scope})`;
}

console.log('ArcLancer frontend — Circle programmable wallet env');
console.log(report('NEXT_PUBLIC_CIRCLE_WALLETS_ENABLED'));
console.log(report('NEXT_PUBLIC_CIRCLE_APP_ID'));
console.log(report('CIRCLE_API_KEY'));
console.log(report('ARC_NETWORK'));
console.log('');
console.log(
  'Circle email login is active only when NEXT_PUBLIC_CIRCLE_APP_ID is set at build time and CIRCLE_API_KEY at runtime.'
);
console.log('After adding secrets: redeploy frontend (Actions → Deploy or push to main).');
console.log('Live check: https://arclancer.xyz/api/circle/status');
