const token = process.env.DO_TOKEN;
const appId = '23e82931-1bab-41e2-8fd8-40a2ee2fe074';

if (!token) {
  console.error('DO_TOKEN required');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

const publicEnvs = {
  NEXT_PUBLIC_FACTORY_ADDRESS: '0x0ADf70A390868c7016697edF0640791c3B3e5f31',
  NEXT_PUBLIC_USDC_ADDRESS: '0x3600000000000000000000000000000000000000',
  NEXT_PUBLIC_EURC_ADDRESS: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  NEXT_PUBLIC_STABLEFX_ADDRESS: '0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1',
  NEXT_PUBLIC_ARC_TESTNET_RPC_URL: 'https://rpc.testnet.arc.network',
  NEXT_PUBLIC_APP_URL: 'https://arclancer-58ipp.ondigitalocean.app',
  NEXT_PUBLIC_CCTP_UI_ENABLED: 'true',
  NEXT_PUBLIC_AGENTS_UI_ENABLED: 'true',
  NEXT_PUBLIC_REGISTRY_ADDRESS: '0x28c87a31a6e608dbf90839d10567ed44e7e3bbd1',
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
    throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
  }
  return body;
}

const { app } = await api(`/apps/${appId}`);
const spec = app.spec;

const frontend = spec.services.find((s) => s.name === 'frontend');
if (!frontend) throw new Error('frontend service not found');

const preservedKeys = new Set([
  'DIGITALOCEAN_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'WALLET_ENCRYPTION_SECRET',
  'OPENCLAW_WORKER_URL',
]);

const kept = frontend.envs.filter((e) => preservedKeys.has(e.key));
const updatedPublic = Object.entries(publicEnvs).map(([key, value]) => ({
  key,
  value,
  scope: 'RUN_AND_BUILD_TIME',
}));

frontend.envs = [...kept, ...updatedPublic];

console.log('Updating frontend envs:');
for (const e of updatedPublic) {
  console.log(`  ${e.key} = ${e.value} (${e.scope})`);
}

const update = await api(`/apps/${appId}`, {
  method: 'PUT',
  body: JSON.stringify({ spec }),
});

console.log('App updated:', update.app?.id);

const deploy = await api(`/apps/${appId}/deployments`, {
  method: 'POST',
  body: JSON.stringify({ force_build: true }),
});

console.log('Deployment triggered:', deploy.deployment?.id, deploy.deployment?.phase);
