const BASE = "http://127.0.0.1:4000";

export async function getMetrics() {
  const r = await fetch(`${BASE}/metrics`);
  return r.json();
}

export async function getPriceFeed() {
  const r = await fetch(`${BASE}/price-feed`);
  return r.json();
}

export async function getBanks() {
  const r = await fetch(`${BASE}/banks`);
  return r.json();
}

export async function setBankBalance(id, amount) {
  return fetch(`${BASE}/banks/${id}/set`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  }).then((r) => r.json());
}

export async function depositBank(id, amount) {
  return fetch(`${BASE}/banks/${id}/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  }).then((r) => r.json());
}

export async function withdrawBank(id, amount) {
  return fetch(`${BASE}/banks/${id}/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  }).then((r) => r.json());
}

export async function shockLoss(id, ratio) {
  return fetch(`${BASE}/banks/${id}/shock-loss`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ratio }),
  }).then((r) => r.json());
}

export async function shockRecover(targetCoverage = 1.1) {
  return fetch(`${BASE}/shock/recover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetCoverage }),
  }).then((r) => r.json());
}
