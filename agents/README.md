# Independent agent deployments

Each cloud agent exposes a versioned HTTP contract and can be deployed as its own service. Use Vercel for lightweight request/response agents and Render or Docker for services that need longer execution or background jobs. The local agents are intentionally isolated because Chromium, Playwright, and large document ingestion workloads should not be bundled into Vercel functions.

## Service domains

- `research.<domain>/v1/research`
- `tutor.<domain>/v1/tutor`
- `revision.<domain>/v1/revision`
- `quiz.<domain>/v1/quiz`
- `planner.<domain>/v1/planner`
- `exam.<domain>/v1/exam`
- `formula.<domain>/v1/formula`
- `mistake.<domain>/v1/mistake`
- `sentinel.<domain>/v1/sentinel`
- `quota.<domain>/v1/quota`
- `notifications.<domain>/v1/notifications`
- `nba.<domain>/v1/nba`

## Environment

Copy the relevant `.env.example` into each independent deployment. Secrets are server-only. Service-to-service requests must carry the shared signing secret; clients must never receive provider keys.

## Runtime boundary

`agents/local` is for Presence Engine and lecture/PDF ingestion. Run it with Docker or Render only when browser automation is required, and expose only an authenticated callback to the cloud gateway.
