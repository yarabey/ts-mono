SELECT ed.diaper_type
FROM event_diapers ed
JOIN events e ON e.id = ed.event_id
WHERE e.child_id = $1 AND e.occurred_at >= $2 AND e.occurred_at <= $3;
