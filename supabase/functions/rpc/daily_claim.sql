-- SH-02: daily_claim RPC — server-side streak + coin award
-- Deploy ke Supabase SQL Editor

create or replace function daily_claim(user_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  p profiles%rowtype;
  today_str text := to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM-DD');
  streak_new int;
  bonus int;
  msg text;
  days_diff int;
begin
  select * into p from profiles where id = user_id for update;

  -- Cek sudah claim hari ini
  if p.last_claim_date = today_str then
    return jsonb_build_object('error', 'already_claimed');
  end if;

  -- Hitung days_diff
  days_diff := case
    when p.last_claim_date is null then 1
    else (current_date - p.last_claim_date::date)
  end;

  -- Streak logic
  if days_diff <= 1 then
    streak_new := coalesce(p.streak, 0) + 1;
  elsif p.inventory->>'item_streak_protector' is not null
    and (p.inventory->>'item_streak_protector')::int > 0
    and days_diff <= 2 then
    -- streak protector aktif
    streak_new := coalesce(p.streak, 0) + 1;
    update profiles set inventory = jsonb_set(
      inventory, '{item_streak_protector}',
      to_jsonb((p.inventory->>'item_streak_protector')::int - 1)
    ) where id = user_id;
  else
    streak_new := 1;
  end if;

  -- Bonus koin
  if streak_new % 30 = 0 then
    bonus := 50; msg := 'Mega Streak 30 Hari! +50 Koin';
  elsif streak_new % 7 = 0 then
    bonus := 10; msg := 'Streak Mingguan! +10 Koin';
  else
    bonus := 5; msg := '+5 Koin Harian';
  end if;

  update profiles set
    coins = coalesce(coins, 0) + bonus,
    streak = streak_new,
    last_claim_date = today_str
  where id = user_id;

  return jsonb_build_object(
    'bonus', bonus,
    'streak', streak_new,
    'msg', msg,
    'coins_new', coalesce(p.coins, 0) + bonus
  );
end; $$;
