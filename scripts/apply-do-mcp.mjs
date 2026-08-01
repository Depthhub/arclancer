/**
 * Apply MCP ingress + mcp-server component to the live DigitalOcean app.
 * Usage: DO_TOKEN=... node scripts/apply-do-mcp.mjs
 */
const token = process.env.DO_TOKEN || process.env.DIGITALOCEAN_ACCESS_TOKEN;
const appId = process.env.DO_APP_ID || '23e82931-1bab-41e2-8fd8-40a2ee2fe074';

if (!token) {
  console.error('Set DO_TOKEN or DIGITALOCEAN_ACCESS_TOKEN');
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
    throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${text.slice(0, 1200)}`);
  }
  return body;
}

function upsertEnv(envs, key, value, scope = 'RUN_TIME') {
  const entry = envs.find((e) => e.key === key);
  if (entry) {
    entry.value = value;
    entry.scope = scope;
    delete entry.type;
  } else {
    envs.push({ key, value, scope });
  }
}

const ingress = {
  rules: [
    {
      component: { name: 'mcp-server', preserve_path_prefix: true },
      match: { authority: { exact: 'mcp.arclancer.xyz' }, path: { prefix: '/' } },
    },
    {
      component: { name: 'mcp-server', preserve_path_prefix: true },
      match: { path: { prefix: '/mcp' } },
    },
    {
      component: { name: 'mcp-server', preserve_path_prefix: true },
      match: { path: { prefix: '/oauth' } },
    },
    {
      component: { name: 'mcp-server', preserve_path_prefix: true },
      match: { path: { prefix: '/.well-known' } },
    },
    {
      component: { name: 'mcp-server', preserve_path_prefix: true },
      match: { path: { prefix: '/health' } },
    },
    {
      component: { name: 'mcp-server', preserve_path_prefix: true },
      match: { path: { prefix: '/creator-tickets' } },
    },
    {
      component: { name: 'frontend' },
      match: { path: { prefix: '/' } },
    },
  ],
};

const mcpServerTemplate = {
  name: 'mcp-server',
  github: { repo: 'Depthhub/arclancer', branch: 'main', deploy_on_push: true },
  source_dir: '/',
  build_command: 'npm --prefix frontend install && npm --prefix mcp-server install',
  run_command: 'npm --prefix mcp-server run start:http',
  http_port: 3100,
  instance_count: 1,
  instance_size_slug: 'apps-s-1vcpu-0.5gb',
  health_check: { http_path: '/health' },
  envs: [
    { key: 'MCP_HTTP_PORT', value: '3100', scope: 'RUN_TIME' },
    { key: 'NEXT_PUBLIC_APP_URL', value: 'https://arclancer.xyz', scope: 'RUN_TIME' },
    { key: 'MCP_PUBLIC_ORIGIN', value: 'https://arclancer.xyz', scope: 'RUN_TIME' },
    { key: 'APP_PUBLIC_ORIGIN', value: 'https://arclancer.xyz', scope: 'RUN_TIME' },
    { key: 'NEXT_PUBLIC_ARC_TESTNET_RPC_URL', value: 'https://rpc.testnet.arc.network', scope: 'RUN_TIME' },
    { key: 'ARC_NETWORK', value: 'testnet', scope: 'RUN_TIME' },
    { key: 'CREATOR_MCP_TICKET_TTL_SECONDS', value: '300', scope: 'RUN_TIME' },
    { key: 'MCP_API_KEY', scope: 'RUN_TIME', type: 'SECRET' },
    { key: 'WALLET_ENCRYPTION_SECRET', scope: 'RUN_TIME', type: 'SECRET' },
    { key: 'CIRCLE_API_KEY', scope: 'RUN_TIME', type: 'SECRET' },
    { key: 'CIRCLE_PAYMENT_GATEWAY_URL', scope: 'RUN_TIME', type: 'SECRET' },
    { key: 'UPSTASH_REDIS_REST_URL', scope: 'RUN_TIME', type: 'SECRET' },
    { key: 'UPSTASH_REDIS_REST_TOKEN', scope: 'RUN_TIME', type: 'SECRET' },
    { key: 'CREATOR_MCP_TICKET_SECRET', scope: 'RUN_TIME', type: 'SECRET' },
  ],
};

const { app } = await api(`/apps/${appId}`);
const spec = app.spec;

spec.ingress = ingress;
spec.domains = [
  { domain: 'arclancer.xyz', type: 'PRIMARY' },
  { domain: 'www.arclancer.xyz', type: 'ALIAS' },
  { domain: 'mcp.arclancer.xyz', type: 'ALIAS' },
];

let mcp = spec.services?.find((s) => s.name === 'mcp-server');
if (!mcp) {
  mcp = structuredClone(mcpServerTemplate);
  spec.services.push(mcp);
} else {
  delete mcp.routes;
  upsertEnv(mcp.envs, 'MCP_PUBLIC_ORIGIN', 'https://arclancer.xyz');
  upsertEnv(mcp.envs, 'APP_PUBLIC_ORIGIN', 'https://arclancer.xyz');
}

const frontend = spec.services?.find((s) => s.name === 'frontend');
if (frontend) {
  delete frontend.routes;
  upsertEnv(frontend.envs, 'NEXT_PUBLIC_MCP_URL', 'https://arclancer.xyz/mcp', 'RUN_AND_BUILD_TIME');
}

for (const service of spec.services || []) {
  delete service.routes;
}

console.log('Applying ingress + mcp-server routing to app', appId);

const update = await api(`/apps/${appId}`, {
  method: 'PUT',
  body: JSON.stringify({ spec }),
});

console.log('App updated:', update.app?.id);
console.log('Default ingress:', update.app?.default_ingress);

const deploy = await api(`/apps/${appId}/deployments`, {
  method: 'POST',
  body: JSON.stringify({ force_build: true }),
});

console.log('Deployment triggered:', deploy.deployment?.id, deploy.deployment?.phase);
console.log('After deploy, verify:');
console.log('  https://arclancer.xyz/.well-known/oauth-authorization-server');
console.log('  https://arclancer.xyz/mcp');
console.log('Add DNS CNAME mcp.arclancer.xyz ->', update.app?.default_ingress || 'your DO ingress');
