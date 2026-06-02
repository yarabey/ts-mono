SELECT COALESCE(ew.duration_min,
    CASE WHEN ew.started_at IS NOT NULL AND ew.ended_at IS NOT NULL
      THEN CAST(EXTRACT(EPOCH FROM (ew.ended_at - ew.started_at)) / 60 AS INTEGER)
    END) AS duration_min
FROM event_walks ew
JOIN events e ON e.id = ew.event_id
WHERE e.child_id = $1 AND e.occurred_at >= $2 AND e.occurred_at <= $3;
