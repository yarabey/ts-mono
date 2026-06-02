SELECT es.started_at, es.ended_at
FROM event_sleep es
JOIN events e ON e.id = es.event_id
WHERE e.child_id = $1 AND e.occurred_at >= $2 AND e.occurred_at <= $3
  AND es.ended_at IS NOT NULL AND es.started_at IS NOT NULL
ORDER BY es.started_at ASC;
