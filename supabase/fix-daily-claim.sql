-- Fix daily_claim: tombol klaim harian + format tanggal YYYY-MM-DD (Asia/Jakarta)
-- Paste di Supabase SQL Editor → Run

create or replace function public.daily_claim()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles%rowtype;
  uid uuid := auth.uid();
  today_str text := to_char((now() at time zone 'Asia/Jakarta'), 'YYYY-MM-DD');
  last_str text;
  streak_new int;
  bonus int;
  msg text;
  days_diff int;
begin
  if uid is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  select * into p from public.profiles where id = uid for update;
  if not found then
    return jsonb_build_object('error', 'profile_not_found');
  end if;

  if p.last_claim_date is null or btrim(p.last_claim_date) = '' then
    last_str := null;
  elsif p.last_claim_date ~ '^\d{4}-\d{2}-\d{2}' then
    last_str := left(p.last_claim_date, 10);
  else
    begin
      last_str := to_char(p.last_claim_date::timestamptz at time zone 'Asia/Jakarta', 'YYYY-MM-DD');
    exception when others then
      last_str := null;
    end;
  end if;

  if last_str is not null and last_str = today_str then
    return jsonb_build_object(
      'error', 'already_claimed',
      'streak', coalesce(p.streak, 0),
      'coins_new', coalesce(p.coins, 0)
    );
  end if;

  if last_str is null then
    days_diff := 1;
  else
    days_diff := (today_str::date - last_str::date);
  end if;

  if days_diff <= 1 then
    streak_new := coalesce(p.streak, 0) + 1;
  elsif coalesce((p.inventory->>'item_streak_protector')::int, 0) > 0 and days_diff = 2 then
    streak_new := coalesce(p.streak, 0) + 1;
    update public.profiles
    set inventory = jsonb_set(
      coalesce(inventory, '{}'::jsonb),
      '{item_streak_protector}',
      to_jsonb(greatest(0, (p.inventory->>'item_streak_protector')::int - 1))
    )
    where id = uid;
  else
    streak_new := 1;
  end if;

  if streak_new % 30 = 0 then
    bonus := 300; msg := 'Mega Streak 30 Hari! +300 Koin';
  elsif streak_new % 7 = 0 then
    bonus := 100; msg := 'Streak Mingguan! +100 Koin';
  else
    bonus := 30; msg := 'Klaim harian! +30 Koin';
  end if;

  update public.profiles set
    coins = coalesce(coins, 0) + bonus,
    streak = streak_new,
    last_claim_date = today_str
  where id = uid;

  return jsonb_build_object(
    'bonus', bonus,
    'streak', streak_new,
    'msg', msg,
    'coins_new', coalesce(p.coins, 0) + bonus,
    'last_claim_date', today_str
  );
end;
$$;

revoke all on function public.daily_claim() from public;
grant execute on function public.daily_claim() to authenticated;

select 'daily_claim fixed' as status;
