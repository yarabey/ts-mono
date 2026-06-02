SELECT es.sleep_type,
  COALESCE(es.duration_min,
    CASE WHEN es.started_at IS NOT NULL AND es.ended_at IS NOT NULL
      THEN CAST(EXTRACT(EPOCH FROM (es.ended_at - es.started_at)) / 60 AS INTEGER)
    END) AS duration_min
FROM event_sleep es
JOIN events e ON e.id = es.event_id
WHERE e.child_id = $1 AND e.occurred_at >= $2 AND e.occurred_at <= $3;
