-- TypedSQL: retrieve a greeting template by locale
SELECT "template" FROM "GreetingTemplate" WHERE "locale" = $1 LIMIT 1;
