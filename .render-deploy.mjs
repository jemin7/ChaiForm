import { readFileSync } from "node:fs";

const API_KEY = process.env.RENDER_API_KEY;
const OWNER_ID = "tea-d7b1q65m5p6s73alt5u0";

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
const pick = (...keys) =>
  keys.filter((k) => e[k]).map((k) => ({ key: k, value: e[k] }));

const payload = {
  type: "web_service",
  name: "chaiform-api",
  ownerId: OWNER_ID,
  repo: "https://github.com/jemin7/ChaiForm",
  branch: "main",
  autoDeploy: "yes",
  serviceDetails: {
    env: "node",
    plan: "free",
    rootDir: "apps/api",
    envSpecificDetails: {
      buildCommand:
        "cd ../.. && pnpm install --frozen-lockfile --prod=false && pnpm --filter @repo/api build",
      startCommand: "node dist/index.cjs",
      healthCheckPath: "/health",
    },
    envVars: [
      { key: "NODE_ENV", value: "production" },
      ...pick(
        "MONGODB_URI",
        "AUTH_SECRET",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "AI_API_KEY",
        "AI_BASE_URL",
        "AI_MODEL",
        "RESEND_API_KEY",
        "EMAIL_FROM",
      ),
      // Set after the service URL is known (see WEB_URL note in README).
      { key: "WEB_URL", value: "http://localhost:3000" },
    ],
  },
};

const res = await fetch("https://api.render.com/v1/services", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const body = await res.text();
console.log(`HTTP ${res.status}`);
if (!res.ok) {
  console.log(body.slice(0, 2000));
  process.exitCode = 1;
} else {

  const svc = JSON.parse(body);
  console.log(
    JSON.stringify(
      {
        id: svc.id,
        name: svc.name,
        url: svc.serviceDetails?.url,
        status: "created",
      },
      null,
      2,
    ),
  );
}
