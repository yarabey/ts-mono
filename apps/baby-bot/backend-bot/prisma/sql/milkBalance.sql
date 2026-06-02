SELECT
  (SELECT COALESCE(SUM(ep.amount_ml), 0)
     FROM event_pumping ep JOIN events e ON e.id = ep.event_id
     WHERE e.child_id = $1 AND e.occurred_at >= $2 AND e.occurred_at <= $3) AS pumped_ml,
  (SELECT COALESCE(SUM(ef.amount_ml), 0)
     FROM event_feedings ef JOIN events e ON e.id = ef.event_id
     WHERE e.child_id = $1 AND e.occurred_at >= $2 AND e.occurred_at <= $3
       AND ef.feeding_type = 'bottle' AND ef.food_name = 'Грудное молоко') AS fed_ml;
