-- Ensure order numbers stay unique per team/day even under concurrency
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS orders_team_order_number_key ON public.orders (team_id, order_number);

CREATE OR REPLACE FUNCTION public.generate_order_number(p_team_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path TO public
AS $function$
DECLARE
  today_date TEXT;
  next_seq INT;
  lock_key BIGINT;
BEGIN
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  lock_key := hashtextextended(COALESCE(p_team_id::text, '') || today_date, 0);

  -- Prevent concurrent inserts from generating the same number for the same team/date
  PERFORM pg_advisory_xact_lock(lock_key);

  SELECT COALESCE(MAX(split_part(order_number, '-', 3)::INT), 0) + 1
  INTO next_seq
  FROM orders
  WHERE team_id = p_team_id
    AND order_number LIKE 'ORD-' || today_date || '-%';

  RETURN FORMAT('ORD-%s-%s', today_date, LPAD(next_seq::TEXT, 3, '0'));
END;
$function$;
