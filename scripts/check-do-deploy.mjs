const token = process.env.DO_TOKEN;
const appId = '23e82931-1bab-41e2-8fd8-40a2ee2fe074';
const deploymentId = process.argv[2];

const headers = { Authorization: `Bearer ${token}` };

const res = await fetch(`https://api.digitalocean.com/v2/apps/${appId}/deployments/${deploymentId}`, { headers });
const { deployment } = await res.json();
console.log(JSON.stringify({ phase: deployment.phase, progress: deployment.progress, created_at: deployment.created_at }, null, 2));
