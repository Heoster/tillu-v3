# Local lecture and presence agent

This service is deliberately separate from Vercel cloud functions. It owns Chromium/Playwright, CBSE lecture ingestion, PDF extraction, and browser presence signals. It should accept only authenticated service-to-service callbacks and return bounded, redacted results.

Required endpoints:

- `GET /health`
- `GET /ready`
- `POST /v1/lecture/ingest`
- `POST /v1/presence/signal`

Required environment variables are documented in `../.env.example`. Add a real implementation here only with browser dependencies installed in this package; do not import them from cloud agents.
