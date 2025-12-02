-- Uptime SLO Tracking (Prisma already created tables, just add sample data)
INSERT INTO system_uptime_metrics (id, "serviceName", status, "responseTimeMs", "errorRate", metadata, timestamp)
SELECT 
  gen_random_uuid(),
  'nexora-api',
  CASE WHEN random() > 0.001 THEN 'up' ELSE 'down' END,
  (50 + random() * 200)::integer,
  CASE WHEN random() > 0.99 THEN 0.01 ELSE 0.0001 END,
  '{}',
  generate_series(
    NOW() - INTERVAL '30 days',
    NOW(),
    INTERVAL '5 minutes'
  );
