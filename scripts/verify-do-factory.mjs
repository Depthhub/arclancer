const base = 'https://arclancer-58ipp.ondigitalocean.app';
const html = await fetch(`${base}/dashboard`).then((r) => r.text());
const chunks = [...new Set([...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0]))];
let has0ADf = false;
let has9b48 = false;
for (const path of chunks) {
  const js = await fetch(base + path).then((r) => r.text());
  if (js.includes('0x0ADf70A390868c7016697edF0640791c3B3e5f31')) has0ADf = true;
  if (js.includes('0x9b48008e55232E9b61886417b79a881f0A71568F')) has9b48 = true;
}
console.log(JSON.stringify({ has0ADf, has9b48, ok: has0ADf && !has9b48 }));
