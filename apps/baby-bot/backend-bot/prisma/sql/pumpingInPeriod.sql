SELECT ep.breast_side, ep.amount_ml
FROM event_pumping ep
JOIN events e ON e.id = ep.event_id
WHERE e.child_id = $1 AND e.occurred_at >= $2 AND e.occurred_at <= $3;
