# Monitoring Alerts Setup

This guide configures production monitoring for SafeNode backend uptime and error alerting.

## 1) Uptime Monitoring (Automated in GitHub Actions)

Workflow: `.github/workflows/uptime-monitor.yml`

It runs every 5 minutes and checks:
- `GET <BACKEND_HEALTH_URL>` (expected HTTP `200`)
- payload `status === "ready"`
- payload `checks.database === "connected"` (or `not_configured`)

If unhealthy:
- sends webhook alert (if `ALERT_WEBHOOK_URL` is configured)
- opens/updates a GitHub issue labeled `uptime-alert`

Required GitHub repository secrets:
- `BACKEND_HEALTH_URL` (example: `https://api.safe-node.app/api/health/ready`)

Optional GitHub repository secrets:
- `ALERT_WEBHOOK_URL` (Slack/Discord/Teams incoming webhook URL)

## 2) Sentry Error Alerts

Enable both backend and frontend DSNs in production:
- Backend: `SENTRY_DSN` (or `SENTRY_DSN_BACKEND`)
- Frontend: `VITE_SENTRY_DSN`

Then in Sentry project settings, create alert rules:
- Condition: `event.level:error`
- Filter: `environment:production`
- Trigger: `>= 1` event in `5m` (critical)
- Action: send to Slack/email/on-call integration

Recommended additional alert:
- Condition: crash-free sessions below `99.5%` (frontend)

## 3) Vercel Logs Alerts

In Vercel project settings:
- Enable Runtime Logs retention for backend project.
- Create notification/webhook integration for deployment failures.
- Enable alerts for:
  - production deployment failed
  - function invocation errors spike
  - edge/serverless 5xx increase

Recommended channels:
- Slack (team channel)
- email (owner/admin)
- webhook (incident system)

## 4) Test Alerts

1. Run GitHub action manually: `Uptime Monitor -> Run workflow`.
2. Temporarily set `BACKEND_HEALTH_URL` to invalid endpoint and rerun.
3. Confirm:
   - webhook message is delivered
   - GitHub issue `uptime-alert` is created/updated
4. Restore correct URL.

