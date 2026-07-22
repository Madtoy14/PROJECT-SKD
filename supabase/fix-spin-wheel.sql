-- Apply di Supabase SQL Editor (SETELAH backup ringan).
-- Fix: spin_wheel search_path + last_spin_date YYYY-MM-DD Asia/Jakarta + paid spin.

create or replace function public.spin_wheel()
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
  r float := random() * 100;
  cumulative float := 0;
  prize_id text;
  prize_count int;
  prize_title text;
  is_coins bool := false;
  is_energy bool := false;
  paid_spin bool := false;
  prizes jsonb := '[
    {"id":"item_waktu_beku",      "title":"Waktu Beku",          "count":1,   "weight":15, "isCoins":false, "isEnergy":false},
    {"id":"item_skor_ganda",      "title":"Skor Ganda",          "count":1,   "weight":15, "isCoins":false, "isEnergy":false},
    {"id":"item_terawangan",      "title":"Teropong Sakti",      "count":1,   "weight":15, "isCoins":false, "isEnergy":false},
    {"id":"coins_100",            "title":"100 Koin",            "count":100, "weight":20, "isCoins":true,  "isEnergy":false},
    {"id":"item_kesempatan_kedua","title":"Kesempatan Kedua",    "count":1,   "weight":10, "isCoins":false, "isEnergy":false},
    {"id":"energy_5",             "title":"5 Energi",            "count":5,   "weight":12, "isCoins":false, "isEnergy":true},
    {"id":"coins_500",            "title":"500 Koin (Jackpot!)", "count":500, "weight":3,  "isCoins":true,  "isEnergy":false}
  ]'::jsonb;
  prize jsonb;
  i int;
begin
  if uid is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  select * into p from public.profiles where id = uid for update;
  if not found then
    return jsonb_build_object('error', 'profile_not_found');
  end if;

  if p.last_spin_date is null or btrim(p.last_spin_date) = '' then
    last_str := null;
  elsif p.last_spin_date ~ '^\d{4}-\d{2}-\d{2}' then
    last_str := left(p.last_spin_date, 10);
  else
    begin
      last_str := to_char(p.last_spin_date::timestamptz at time zone 'Asia/Jakarta', 'YYYY-MM-DD');
    exception when others then
      last_str := null;
    end;
  end if;

  if last_str is not null and last_str = today_str then
    if coalesce(p.coins, 0) < 100 then
      return jsonb_build_object('error', 'insufficient_coins', 'coins', coalesce(p.coins, 0));
    end if;
    paid_spin := true;
    update public.profiles set coins = coins - 100 where id = uid;
  end if;

  for i in 0..jsonb_array_length(prizes)-1 loop
    prize := prizes->i;
    cumulative := cumulative + (prize->>'weight')::float;
    if r <= cumulative then
      prize_id    := prize->>'id';
      prize_count := (prize->>'count')::int;
      prize_title := prize->>'title';
      is_coins    := (prize->>'isCoins')::bool;
      is_energy   := (prize->>'isEnergy')::bool;
      exit;
    end if;
  end loop;

  if prize_id is null then
    prize := prizes->0;
    prize_id    := prize->>'id';
    prize_count := (prize->>'count')::int;
    prize_title := prize->>'title';
    is_coins    := (prize->>'isCoins')::bool;
    is_energy   := (prize->>'isEnergy')::bool;
  end if;

  if is_coins then
    update public.profiles set coins = coins + prize_count where id = uid;
  elsif is_energy then
    update public.profiles set energy = least(24, coalesce(energy, 0) + prize_count) where id = uid;
  else
    update public.profiles set
      inventory = jsonb_set(
        coalesce(inventory, '{}'::jsonb),
        array[prize_id],
        to_jsonb(coalesce((inventory->>prize_id)::int, 0) + prize_count)
      )
    where id = uid;
  end if;

  update public.profiles set last_spin_date = today_str where id = uid;

  select coins, energy, inventory into p from public.profiles where id = uid;

  return jsonb_build_object(
    'prize_id',    prize_id,
    'prize_title', prize_title,
    'prize_count', prize_count,
    'is_coins',    is_coins,
    'is_energy',   is_energy,
    'paid',        paid_spin,
    'coins_new',   p.coins,
    'energy_new',  p.energy,
    'inventory',   p.inventory,
    'last_spin_date', today_str
  );
end; $$;

revoke all on function public.spin_wheel() from public;
grant execute on function public.spin_wheel() to authenticated;

select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'spin_wheel';
