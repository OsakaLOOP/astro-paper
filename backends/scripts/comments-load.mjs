#!/usr/bin/env node

const base = (process.env.API_URL ?? "https://api.loopo.cc").replace(/\/$/, "");
const post = process.env.POST ?? "/neurodiversity-01";
const rounds = Number(process.env.ROUNDS ?? 20);
const concurrency = Number(process.env.CONCURRENCY ?? 5);
const cookie = process.env.COOKIE;
const expectedMeStatus = Number(process.env.EXPECT_ME_STATUS ?? (cookie ? 200 : 401));

if (!Number.isInteger(rounds) || rounds < 1 || !Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error("ROUNDS and CONCURRENCY must be positive integers");
}

const headers = cookie ? { cookie } : undefined;
const samples = [];
const failures = [];
const request = async (name, url) => {
  const started = performance.now();
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    const body = await response.text();
    const sample = { name, status: response.status, ms: Math.round(performance.now() - started) };
    samples.push(sample);
    const expected = name === "me" ? response.status === expectedMeStatus : response.ok;
    if (!expected) failures.push({ ...sample, body: body.slice(0, 180) });
    return sample;
  } catch (error) {
    const sample = { name, status: 0, ms: Math.round(performance.now() - started) };
    samples.push(sample);
    failures.push({ ...sample, body: String(error) });
    return sample;
  }
};

let nextRound = 0;
const worker = async () => {
  while (true) {
    const round = nextRound++;
    if (round >= rounds) return;
    await Promise.all([
      request("me", `${base}/blog/auth/me`),
      request("comments", `${base}/blog/comments?post=${encodeURIComponent(post)}`),
    ]);
  }
};

const started = performance.now();
await Promise.all(Array.from({ length: Math.min(concurrency, rounds) }, worker));
const elapsed = Math.round(performance.now() - started);

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] ?? 0;
};
const summary = {};
for (const name of ["me", "comments"]) {
  const rows = samples.filter(sample => sample.name === name);
  const ok = rows.filter(sample => name === "me" ? sample.status === expectedMeStatus : sample.status >= 200 && sample.status < 300).length;
  const times = rows.map(sample => sample.ms);
  summary[name] = {
    requests: rows.length,
    success: ok,
    failures: rows.length - ok,
    success_rate: rows.length ? Number((ok / rows.length).toFixed(4)) : 0,
    p50_ms: percentile(times, 0.5),
    p95_ms: percentile(times, 0.95),
    max_ms: Math.max(0, ...times),
  };
}
console.log(JSON.stringify({ base, post, rounds, concurrency, expected_me_status: expectedMeStatus, elapsed_ms: elapsed, summary, failures: failures.slice(0, 20) }, null, 2));
if (failures.length) process.exitCode = 1;
