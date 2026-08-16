import { readFileSync } from "node:fs";

const KEY = process.env.RENDER_API_KEY;
const SID = "srv-da0a67dbedkc73aa1m4g";
const base = `https://api.render.com/v1/services/${SID}`;
const h = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

function loadEnv() {
  const raw = readFileSync(".env", "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
  }
  return env;
}

const e = loadEnv();
const envVars = [
  { key: "NODE_ENV", value: "production" },
  { key: "BASE_URL", value: "https://chaiform-api.onrender.com" },
  { key: "WEB_URL", value: "http://localhost:3000" }, // updated after Vercel deploy
  ...["MONGODB_URI", "AUTH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
    "AI_API_KEY", "AI_BASE_URL", "AI_MODEL", "RESEND_API_KEY", "EMAIL_FROM"]
    .filter((k) => e[k])
    .map((k) => ({ key: k, value: e[k] })),
];

// 1. Restore the full env var set (PUT replaces everything).
let res = await fetch(`${base}/env-vars`, {
  method: "PUT",
  headers: h,
  body: JSON.stringify(envVars),
});
console.log(`env-vars PUT: ${res.status} (${envVars.map((v) => v.key).join(", ")})`);

// 2. Update the service config: rootDir + build command that installs devDependencies.
res = await fetch(base, {
  method: "PATCH",
  headers: h,
  body: JSON.stringify({
    rootDir: "apps/api",
    serviceDetails: {
      envSpecificDetails: {
        buildCommand:
          "cd ../.. && corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm --filter @repo/api build",
        startCommand: "node dist/index.cjs",
        healthCheckPath: "/health",
      },
    },
  }),
});
const patchBody = await res.text();
console.log(`service PATCH: ${res.status}`);
if (!res.ok) console.log(patchBody.slice(0, 800));

// 3. Trigger a fresh deploy.
res = await fetch(`${base}/deploys`, {
  method: "POST",
  headers: h,
  body: JSON.stringify({ clearCache: "clear" }),
});
const depBody = await res.json();
console.log(`deploy triggered: ${res.status}`);
if (res.ok) console.log(`deploy id: ${depBody.id}`);
