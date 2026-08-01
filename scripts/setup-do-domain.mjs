/**
 * Add custom domain to DO app and update NEXT_PUBLIC_APP_URL.
 * Usage: DO_TOKEN=... node scripts/setup-do-domain.mjs [domain]
 */
const token = process.env.DO_TOKEN;
const appId = '23e82931-1bab-41e2-8fd8-40a2ee2fe074';
const domain = (process.argv[2] || 'arclancer.xyz').replace(/^https?:\/\//, '').replace(/\/$/, '');
const wwwDomain = `www.${domain}`;
const appUrl = `https://${domain}`;

if (!token) {
  console.error('DO_TOKEN required');
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
const spec = app.spec;

spec.domains = [
  { domain, type: 'PRIMARY' },
  { domain: wwwDomain, type: 'ALIAS' },
];

const frontend = spec.services.find((s) => s.name === 'frontend');
if (!frontend) throw new Error('frontend service not found');

for (const env of frontend.envs) {
  if (env.key === 'NEXT_PUBLIC_APP_URL') {
    env.value = appUrl;
    env.scope = 'RUN_AND_BUILD_TIME';
  }
}
if (!frontend.envs.some((e) => e.key === 'NEXT_PUBLIC_APP_URL')) {
  frontend.envs.push({
    key: 'NEXT_PUBLIC_APP_URL',
    value: appUrl,
    scope: 'RUN_AND_BUILD_TIME',
  });
}

console.log('Updating app spec:');
console.log('  domains:', spec.domains.map((d) => `${d.domain} (${d.type})`).join(', '));
console.log('  NEXT_PUBLIC_APP_URL:', appUrl);

const update = await api(`/apps/${appId}`, {
  method: 'PUT',
  body: JSON.stringify({ spec }),
});

console.log('App updated:', update.app?.id);
console.log('Default ingress:', update.app?.default_ingress);
console.log('Live URL:', update.app?.live_url);

const deploy = await api(`/apps/${appId}/deployments`, {
  method: 'POST',
  body: JSON.stringify({ force_build: true }),
});

console.log('Deployment triggered:', deploy.deployment?.id, deploy.deployment?.phase);
