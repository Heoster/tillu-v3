# TILLU — Environment Variable Specification

> Version: v1.0  
> Last updated: Phase 0  
> Security rule: Never commit `.env` files. Use `.env.example` with placeholder values only.

---

## Usage

Copy `.env.example` to `.env` (gitignored) and fill in real values for your environment.

```bash
cp .env.example .env
```

Each app/agent loads only the variables it needs. Variables are documented below by service and sensitivity level.

**Sensitivity levels:**
- `PUBLIC` — safe to expose to browser / logged
- `SERVER` — backend only, never browser
- `SECRET` — never logged, never browser, rotated regularly

---

## 1. Supabase (`apps/api`, `supabase/`)

| Variable | Required | Sensitivity | Description |
|----------|----------|-------------|-------------|
| `SUPABASE_URL` | yes | PUBLIC | Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | yes | PUBLIC | Supabase anonymous/public key — used in frontend for auth flows only |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | SECRET | Supabase service-role key — backend only; bypasses RLS; never exposed to browser |
| `DATABASE_URL` | yes | SECRET | Direct PostgreSQL connection string for migrations/seeds |

---

## 2. Core API (`apps/api`)

| Variable | Required | Sensitivity | Description |
|----------|----------|-------------|-------------|
| `PORT` | no | PUBLIC | API listen port (default: `3001`) |
| `NODE_ENV` | yes | PUBLIC | `development` \| `staging` \| `production` |
| `API_BASE_URL` | yes | PUBLIC | Public base URL of this API (used in agent callbacks) |
| `JWT_SECRET` | yes | SECRET | Secret used to sign internal JWT tokens |
| `CORS_ORIGINS` | yes | SERVER | Comma-separated allowed CORS origins |
| `RATE_LIMIT_WINDOW_MS` | no | SERVER | Rate limit window in ms (default: `60000`) |
| `RATE_LIMIT_MAX` | no | SERVER | Max requests per window (default: `100`) |

---

## 3. AI Model Providers (`packages/model-router`)

All keys are SECRET — server-side only, never in frontend bundle.

| Variable | Required | Sensitivity | Description |
|----------|----------|-------------|-------------|
| `GROQ_API_KEY` | yes | SECRET | Groq API key — primary fast model provider |
| `GROQ_DEFAULT_MODEL` | no | SERVER | Default Groq model (default: `llama-3.3-70b-versatile`) |
| `CEREBRAS_API_KEY` | yes | SECRET | Cerebras API key — used for fast inference tasks |
| `CEREBRAS_DEFAULT_MODEL` | no | SERVER | Default Cerebras model (default: `llama-3.3-70b`) |
| `OPENROUTER_API_KEY` | yes | SECRET | OpenRouter API key — fallback and stronger models |
| `OPENROUTER_DEFAULT_MODEL` | no | SERVER | Default OpenRouter model |
| `HF_API_KEY` | no | SECRET | Hugging Face Inference API key (optional provider) |
| `MODEL_ROUTER_TIMEOUT_MS` | no | SERVER | Per-provider request timeout (default: `30000`) |
| `MODEL_ROUTER_MAX_RETRIES` | no | SERVER | Max retries before fallback (default: `2`) |
| `MODEL_ROUTER_CIRCUIT_BREAKER_THRESHOLD` | no | SERVER | Failure count before circuit opens (default: `5`) |
| `MODEL_ROUTER_CIRCUIT_BREAKER_COOLDOWN_MS` | no | SERVER | Cooldown before HALF_OPEN attempt (default: `60000`) |

---

## 4. Web Frontend (`apps/web`)

Only PUBLIC / NEXT_PUBLIC variables are exposed to the browser.

| Variable | Required | Sensitivity | Description |
|----------|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | PUBLIC | Same as `SUPABASE_URL` — browser auth flows |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | PUBLIC | Same as `SUPABASE_ANON_KEY` — browser auth flows |
| `NEXT_PUBLIC_API_BASE_URL` | yes | PUBLIC | URL of `apps/api` (e.g. `https://api.tillu.app`) |

---

## 5. Local Agent (`apps/local-agent`)

| Variable | Required | Sensitivity | Description |
|----------|----------|-------------|-------------|
| `LOCAL_AGENT_PORT` | no | PUBLIC | Local HTTP port (default: `3099`) |
| `LOCAL_AGENT_SECRET` | yes | SECRET | Shared secret for API ↔ local agent auth |
| `LOCAL_AGENT_CHROMIUM_PATH` | no | SERVER | Custom Chromium executable path |
| `LOCAL_AGENT_ALLOWED_DOMAINS` | yes | SERVER | Comma-separated approved domains (e.g. `youtube.com`) |
| `CLOUD_API_URL` | yes | SERVER | URL of `apps/api` for sync |
| `LOCAL_AGENT_SYNC_INTERVAL_MS` | no | SERVER | Sync interval to cloud (default: `30000`) |
| `LOCAL_QUEUE_PATH` | no | SERVER | Path for offline event queue (default: `./data/queue.json`) |

---

## 6. Agents (all agents share this base)

Each agent is deployed as an independent service and needs:

| Variable | Required | Sensitivity | Description |
|----------|----------|-------------|-------------|
| `AGENT_PORT` | no | PUBLIC | Listen port (default: `3100`) |
| `AGENT_NAME` | yes | PUBLIC | Agent name (e.g. `quiz_agent`) — used in logs and registry |
| `AGENT_VERSION` | yes | PUBLIC | Semver version (e.g. `1.0.0`) |
| `AGENT_SECRET` | yes | SECRET | Shared secret for Core API → agent auth |
| `SUPABASE_URL` | yes | SECRET | Agents access DB directly for reads |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | SECRET | Agents use service role for writes they are authorized for |
| `MODEL_ROUTER_URL` | yes | SERVER | URL of model router (or `internal` if co-located) |

Agent-specific additions:

**Research Agent:**
| Variable | Required | Description |
|----------|----------|-------------|
| `RESEARCH_MAX_SOURCES` | no | Max sources to fetch per query (default: `5`) |
| `RESEARCH_SEARCH_TIMEOUT_MS` | no | Per-search timeout (default: `10000`) |

**Quiz Agent:**
| Variable | Required | Description |
|----------|----------|-------------|
| `QUIZ_DEFAULT_COUNT` | no | Default questions per quiz (default: `10`) |
| `QUIZ_MAX_RETRIES` | no | Retries on schema validation failure (default: `3`) |

**Planner Agent:**
| Variable | Required | Description |
|----------|----------|-------------|
| `PLANNER_REPLAN_THRESHOLD_MIN` | no | Minimum delay before replanning (default: `15`) |
| `PLANNER_MAX_DAILY_HOURS` | no | Hard cap on schedulable hours (default: `8`) |

---

## 7. n8n Automation

| Variable | Required | Sensitivity | Description |
|----------|----------|-------------|-------------|
| `N8N_HOST` | yes | SERVER | n8n instance URL |
| `N8N_API_KEY` | yes | SECRET | n8n API key for workflow triggers |
| `N8N_WEBHOOK_SECRET` | yes | SECRET | Shared secret for incoming webhooks from n8n |

---

## 8. Sentinel

| Variable | Required | Sensitivity | Description |
|----------|----------|-------------|-------------|
| `SENTINEL_POLL_INTERVAL_MS` | no | SERVER | Agent health poll interval (default: `60000`) |
| `SENTINEL_HEARTBEAT_TIMEOUT_MS` | no | SERVER | Missed heartbeat before marking degraded (default: `120000`) |
| `SENTINEL_TEST_INTERVAL_MS` | no | SERVER | Synthetic test interval (default: `3600000` = 1 hour) |
| `SENTINEL_ALERT_WEBHOOK` | no | SECRET | Webhook URL for critical alerts (optional) |

---

## 9. Quota Guardian

| Variable | Required | Sensitivity | Description |
|----------|----------|-------------|-------------|
| `QUOTA_GROQ_DAILY_TOKENS` | no | SERVER | Daily token soft limit for Groq (default: `100000`) |
| `QUOTA_CEREBRAS_DAILY_TOKENS` | no | SERVER | Daily token soft limit for Cerebras |
| `QUOTA_CONSERVE_THRESHOLD` | no | SERVER | Fraction of quota at which CONSERVE activates (default: `0.75`) |
| `QUOTA_EMERGENCY_THRESHOLD` | no | SERVER | Fraction of quota at which EMERGENCY activates (default: `0.90`) |

---

## 10. Logging & Observability

| Variable | Required | Sensitivity | Description |
|----------|----------|-------------|-------------|
| `LOG_LEVEL` | no | PUBLIC | `debug` \| `info` \| `warn` \| `error` (default: `info`) |
| `LOG_FORMAT` | no | PUBLIC | `json` \| `pretty` (default: `json` in production) |

---

## `.env.example` file

The `.env.example` file at repo root must contain **all** variables with placeholder values, no real secrets. Example placeholders:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DATABASE_URL=postgresql://postgres:password@localhost:5432/tillu

PORT=3001
NODE_ENV=development
API_BASE_URL=http://localhost:3001
JWT_SECRET=change-me-in-production
CORS_ORIGINS=http://localhost:3000

GROQ_API_KEY=gsk_your-groq-key-here
CEREBRAS_API_KEY=your-cerebras-key-here
OPENROUTER_API_KEY=sk-or-your-key-here
HF_API_KEY=hf_your-key-here

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

LOCAL_AGENT_SECRET=change-me
LOCAL_AGENT_ALLOWED_DOMAINS=youtube.com,www.youtube.com

N8N_HOST=http://localhost:5678
N8N_API_KEY=your-n8n-api-key
N8N_WEBHOOK_SECRET=change-me

LOG_LEVEL=info
LOG_FORMAT=pretty
```

---

## Security Rules

1. `.env` is in `.gitignore` — **never commit it**.
2. `SUPABASE_SERVICE_ROLE_KEY` and all `_API_KEY` values are backend-only.
3. `NEXT_PUBLIC_*` values will be embedded in the browser bundle — only keys safe for public exposure go here.
4. Rotate `JWT_SECRET`, `AGENT_SECRET`, `N8N_WEBHOOK_SECRET` when deploying to production.
5. Use the host platform's secret manager (Render, Railway, Vercel) in production — not `.env` files on servers.
