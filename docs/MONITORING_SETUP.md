# 📊 SafeNode Monitoring & Alerting Setup

Complete guide to setting up monitoring, alerts, and observability for SafeNode.

---

## 🎯 Overview

This guide covers:
- **Sentry** - Error tracking and performance monitoring
- **Uptime Monitoring** - Service availability tracking
- **Database Monitoring** - Query performance and health
- **Stripe Monitoring** - Webhook delivery and payment tracking
- **Application Metrics** - Custom metrics and dashboards

---

## 1. Sentry Setup

### Initial Configuration

Sentry is already integrated in the codebase. Configure it:

#### Backend Sentry

**Environment Variables:**
```env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
SENTRY_PROFILES_SAMPLE_RATE=0.1  # 10% of profiles
```

**Verify Setup:**
```bash
# Test error tracking
curl -X POST http://localhost:4000/api/test-error
# Should appear in Sentry dashboard
```

#### Frontend Sentry

**Environment Variables:**
```env
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
VITE_SENTRY_ENVIRONMENT=production
```

---

### Alert Rules Setup

#### 1. High Error Rate Alert

**In Sentry Dashboard:**

1. Go to **Alerts** → **Create Alert Rule**
2. **Condition**: When `events` are more than `50` in `5 minutes`
3. **Filter**: Environment = `production`
4. **Action**: Send email/Slack notification
5. **Save**

#### 2. Slow API Response Alert

**Alert Rule:**
1. **Condition**: When `p50(transaction.duration)` is more than `1000ms`
2. **Filter**: Transaction = `/api/*`
3. **Time Window**: `10 minutes`
4. **Action**: Notify team

#### 3. Failed Authentication Alert

**Alert Rule:**
1. **Condition**: When `count()` of `401` errors is more than `100` in `10 minutes`
2. **Filter**: 
   - Transaction = `/api/auth/*`
   - Status = `401`
3. **Action**: Security alert (high priority)

#### 4. Critical Error Alert

**Alert Rule:**
1. **Condition**: When `error level` is `fatal`
2. **Action**: Immediate notification (SMS/PagerDuty)

---

## 2. Uptime Monitoring

### Option A: UptimeRobot (Free Tier Available)

#### Setup

1. **Sign up** at https://uptimerobot.com
2. **Create Monitor**:
   - **Type**: HTTP(S)
   - **URL**: `https://api.safenode.app/health`
   - **Interval**: 5 minutes
   - **Alert Contacts**: Add email/SMS

3. **Configure Alerts**:
   - **Down Alert**: Immediate notification
   - **Up Alert**: When service recovers

#### Multiple Monitors

Create monitors for:
- **API Health**: `https://api.safenode.app/health`
- **Frontend**: `https://app.safenode.app`
- **Stripe Webhooks**: `https://api.safenode.app/api/billing/webhook` (POST only)

---

### Option B: Pingdom

1. **Sign up** at https://www.pingdom.com
2. **Create Check**:
   - **Type**: HTTP
   - **URL**: Your API endpoint
   - **Interval**: 1 minute
3. **Alert Contacts**: Configure team

---

### Option C: Self-Hosted (Uptime Kuma)

**Docker Setup:**
```bash
docker run -d \
  --name uptime-kuma \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  louislam/uptime-kuma:1
```

**Access**: http://localhost:3001
**Setup**: Add monitors for all endpoints

---

## 3. Database Monitoring

### PostgreSQL Monitoring

#### Option A: pgAdmin

**Setup:**
1. Install pgAdmin
2. Connect to production database
3. Enable **Query Statistics**
4. Set up **Slow Query Alerts**

#### Option B: Datadog PostgreSQL Integration

**Environment Variables:**
```env
DATADOG_API_KEY=your-api-key
DATADOG_APP_KEY=your-app-key
```

**Metrics Tracked:**
- Connection pool usage
- Slow queries (>1s)
- Database size
- Replication lag
- Lock waits

---

### MongoDB Monitoring

#### Atlas Monitoring (If Using MongoDB Atlas)

**Dashboard**: https://cloud.mongodb.com

**Alerts:**
1. **High Connection Count**: >80% of max connections
2. **Slow Queries**: Queries >1000ms
3. **Replication Lag**: >10 seconds
4. **Disk Usage**: >80% full

---

### Prisma Query Monitoring

**Enable Query Logging:**

```typescript
// In backend/src/db/prisma.ts
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
  ],
})

prisma.$on('query', (e: any) => {
  if (e.duration > 1000) { // Log slow queries
    console.warn('Slow query detected:', {
      query: e.query,
      duration: e.duration,
      params: e.params
    })
    // Send to monitoring service
  }
})
```

---

## 4. Stripe Webhook Monitoring

### Stripe Dashboard

**Access**: https://dashboard.stripe.com/webhooks

**Monitor:**
1. **Webhook Delivery Success Rate**
   - Should be >99%
   - Alert if <95%

2. **Failed Deliveries**
   - Alert on any failure
   - Check retry status

3. **Webhook Latency**
   - Alert if >5 seconds
   - Check webhook handler performance

---

### Custom Webhook Monitoring

**Create Endpoint:**

```typescript
// backend/src/routes/monitoring.ts
server.get('/api/monitoring/stripe-webhooks', {
  preHandler: requireAuth // Admin only
}, async (request, reply) => {
  // Query database for recent webhook events
  const recentEvents = await db.webhookEvents.findRecent({
    hours: 24,
    provider: 'stripe'
  })
  
  const stats = {
    total: recentEvents.length,
    successful: recentEvents.filter(e => e.success).length,
    failed: recentEvents.filter(e => !e.success).length,
    avgLatency: recentEvents.reduce((sum, e) => sum + e.latency, 0) / recentEvents.length
  }
  
  return stats
})
```

**Set Up Alert:**
- Monitor `/api/monitoring/stripe-webhooks`
- Alert if `failed` > 10 in 1 hour
- Alert if `avgLatency` > 5000ms

---

## 5. Application Metrics

### Custom Metrics Endpoint

**Create Health Check with Metrics:**

```typescript
// backend/src/routes/health.ts
server.get('/health', async (request, reply) => {
  const dbStatus = await checkDatabaseHealth()
  const redisStatus = await checkRedisHealth() // If using Redis
  
  return {
    status: dbStatus.ok && redisStatus.ok ? 'ok' : 'degraded',
    timestamp: Date.now(),
    uptime: process.uptime(),
    database: dbStatus,
    redis: redisStatus,
    memory: {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
      rss: process.memoryUsage().rss
    }
  }
})
```

**Monitor:**
- `/health` endpoint
- Alert if status != `ok`
- Alert if memory usage >80%

---

### Rate Limit Monitoring

**Endpoint:**
```
GET /api/monitoring/rate-limits
```

**Track:**
- Requests per user tier
- Rate limit hits
- Top rate-limited users
- Rate limit patterns

---

## 6. Log Aggregation

### Option A: Logtail (Formerly LogDNA)

**Setup:**
1. Sign up at https://logtail.com
2. Get ingestion key
3. Configure logging:

```typescript
// backend/src/config.ts
import { createWriteStream } from 'fs'
import pino from 'pino'

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-http',
    options: {
      destination: createWriteStream(process.stdout)
    }
  }
})
```

**Configure Logtail:**
- Add logtail agent to server
- Forward application logs
- Set up alerts for ERROR level logs

---

### Option B: Papertrail

**Setup:**
1. Sign up at https://papertrailapp.com
2. Configure syslog forwarding
3. Set up log search alerts

---

### Option C: Self-Hosted (Grafana Loki)

**Docker Setup:**
```yaml
# docker-compose.yml
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
```

---

## 7. Alert Configuration

### Notification Channels

#### Email Alerts

**Configure in each monitoring service:**
- Add team email addresses
- Set priority levels
- Configure alert grouping

#### Slack Alerts

**Sentry → Slack Integration:**
1. Go to Sentry → Integrations
2. Add Slack integration
3. Configure channels:
   - `#alerts-critical` - Fatal errors
   - `#alerts-warning` - Warnings
   - `#alerts-info` - Info

**UptimeRobot → Slack:**
1. Add Slack webhook URL
2. Configure notifications

#### PagerDuty (For Critical Alerts)

**Setup:**
1. Create PagerDuty account
2. Add service
3. Configure escalation policies
4. Integrate with monitoring services

---

## 8. Dashboard Creation

### Grafana Dashboard (Recommended)

**Setup:**
1. Install Grafana
2. Add data sources:
   - PostgreSQL
   - Prometheus (if using)
   - Loki (for logs)

**Create Dashboard Panels:**

**Panel 1: API Health**
- Uptime percentage
- Response time (p50, p95, p99)
- Error rate
- Request rate

**Panel 2: Database**
- Active connections
- Query duration
- Slow queries
- Database size

**Panel 3: Business Metrics**
- Active users
- New signups
- Subscription conversions
- Revenue

**Panel 4: Errors**
- Error rate by endpoint
- Error types
- Error trends

---

## 9. Monitoring Checklist

### Pre-Launch

- [ ] Sentry configured and tested
- [ ] Uptime monitoring active
- [ ] Database monitoring enabled
- [ ] Stripe webhook monitoring setup
- [ ] Alert notifications tested
- [ ] Dashboard created
- [ ] Log aggregation configured
- [ ] Health check endpoint working

### Post-Launch

- [ ] Monitor error rates daily
- [ ] Review slow queries weekly
- [ ] Check uptime status daily
- [ ] Review Stripe webhook success rate
- [ ] Monitor rate limit usage
- [ ] Track application metrics
- [ ] Review and tune alert thresholds

---

## 10. Emergency Procedures

### If Critical Error Detected

1. **Check Sentry** for error details
2. **Review logs** for context
3. **Check database** health
4. **Verify** dependencies (Stripe, etc.)
5. **Fix** and deploy hotfix
6. **Notify** users if data affected

### If Service Down

1. **Check** uptime monitor status
2. **Verify** server is running
3. **Check** database connectivity
4. **Review** recent deployments
5. **Rollback** if needed
6. **Notify** team and users

---

## 📞 Support

- **Monitoring Issues**: monitoring@safenode.app
- **Sentry Support**: https://sentry.io/support
- **Documentation**: https://docs.safenode.app/monitoring

---

**Keep SafeNode running smoothly!** 📊✅

