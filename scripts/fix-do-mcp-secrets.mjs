/**
 * Ensure mcp-server encrypted env vars use type SECRET so DO decrypts EV[...] at runtime.
 * Usage: DO_TOKEN=... node scripts/fix-do-mcp-secrets.mjs
 */
const token = process.env.DO_TOKEN || process.env.DIGITALOCEAN_ACCESS_TOKEN;
const appId = process.env.DO_APP_ID || '23e82931-1bab-41e2-8fd8-40a2ee2fe074';

if (!token) {
  console.error('Set DO_TOKEN');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function api(path, options = {}) {
  const res = await fetch(`https://api.digitalocean.com/v2${path}`, { headers, ...options });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${text.slice(0, 800)}`);
  }
  return body;
}

const { app } = await api(`/apps/${appId}`);
const mcp = app.spec.services?.find((s) => s.name === 'mcp-server');
if (!mcp) throw new Error('mcp-server service not found');

let fixed = 0;
for (const env of mcp.envs ?? []) {
  if (String(env.value ?? '').startsWith('EV[') && env.type !== 'SECRET') {
    console.log(`Fixing ${env.key}: undefined -> SECRET`);
    env.type = 'SECRET';
    env.scope = env.scope || 'RUN_TIME';
    fixed += 1;
  }
}

if (fixed === 0) {
  console.log('No mcp-server secret env fixes needed');
  process.exit(0);
}

await api(`/apps/${appId}`, {
  method: 'PUT',
  body: JSON.stringify({ spec: app.spec }),
});

const deploy = await api(`/apps/${appId}/deployments`, {
  method: 'POST',
  body: JSON.stringify({ force_build: true }),
});

console.log(`Fixed ${fixed} env(s). Deployment: ${deploy.deployment?.id} (${deploy.deployment?.phase})`);
