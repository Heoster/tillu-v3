# ADR-006 — Free-Tier First Architecture

**Date:** Phase 0  
**Status:** Accepted

## Context

Infrastructure budget is ₹0/month. Every hosting decision must work on free tiers.

## Free-Tier Resources Available (as of Phase 0 — verify limits at deployment time)

| Service | Free Tier (approximate) | Use |
|---------|------------------------|-----|
| Supabase | 500MB DB, 2GB bandwidth | Primary state |
| Render | 750hrs/month, sleeps after 15min inactivity | Core API + agents |
| Vercel | Hobby plan, serverless | Web frontend |
| n8n Cloud | 5 workflows, 20 executions/day (or self-host) | Automation |
| Groq | ~14,400 requests/day, 6K tokens/min | Primary AI |
| Cerebras | Rate-limited free tier | Fast AI |
| OpenRouter | Free model routes | Fallback AI |
| Hugging Face | Inference API, Spaces | Optional AI / UI |

**Critical note:** Free-tier limits change. Verify current limits at deployment time before committing to a provider.

## Architecture Decisions Driven by Free-Tier Constraints

### 1. Cold Start Tolerance

Render free tier sleeps after 15 minutes of inactivity. Therefore:
- Every agent must handle cold start gracefully (no warm-up state required for correctness).
- The local agent handles time-critical operations (lecture playback, presence) that can't tolerate cold starts.
- Sentinel pings agents periodically to keep them warm during active use windows.

### 2. Staggered Background Jobs

All n8n scheduled jobs are staggered by 5 minutes to prevent bursting:
```
06:30 → planner
06:35 → quiz generation
06:40 → formula recall
06:45 → research jobs
06:50 → revision scan
```

### 3. Event-Driven Over Polling

Agents react to events rather than continuously polling. When nothing is happening, Tillu sleeps.

### 4. No One Agent Per Host (overrides naive interpretation of TRD)

The TRD suggested every agent on a different host. On free tiers this wastes scarce resources. Instead, we isolate by **failure domain**:

| Failure Domain | What's in it |
|----------------|-------------|
| Database | Supabase |
| Core logic | Core API (Render instance 1) |
| AI agents | Quiz + Tutor + Planner + Formula (Render instance 2) |
| Research | Research Agent (separate — highest AI quota usage) |
| Monitoring | Sentinel (separate — must stay up when others fail) |
| Automation | n8n |
| Local | Local Agent (student's machine) |

### 5. Quota Guardian

A `QuotaGuardian` service tracks token usage across providers. At thresholds:
- `CONSERVE` (75%): reduce background research, increase cache usage, prefer cheaper models
- `EMERGENCY` (90%): stop all non-essential AI calls, use fully deterministic fallbacks

### 6. Deterministic Fallbacks

Every AI-powered feature has a deterministic fallback so a quota emergency doesn't break the core study loop:
- **Revision scheduling**: algorithmic SRS (no AI needed)
- **Daily plan**: rule-based priority scheduling
- **Quiz**: serve from pre-generated question bank
- **Mastery**: event-count based scoring
- **NBA**: priority-ranked list based on mastery + revision due + deadlines

### 7. Local-First for Continuity

The local agent maintains critical state (lecture progress, presence) locally. Cloud outage → local operations continue → sync on reconnect.

## Consequences

- Every agent deployment includes a `Dockerfile` + free-tier deployment guide.
- Quota Guardian is built in Phase 3, not deferred.
- Deterministic fallbacks are implemented alongside AI features, not after.
- Free-tier limits are documented and verified before each phase's deployment.
