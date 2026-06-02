SELECT ef.feeding_type,
  COALESCE(ef.duration_min,
    CASE WHEN ef.started_at IS NOT NULL AND ef.ended_at IS NOT NULL
      THEN CAST(EXTRACT(EPOCH FROM (ef.ended_at - ef.started_at)) / 60 AS INTEGER)
    END) AS duration_min,
  ef.amount_ml
FROM event_feedings ef
JOIN events e ON e.id = ef.event_id
WHERE e.child_id = $1 AND e.occurred_at >= $2 AND e.occurred_at <= $3;
