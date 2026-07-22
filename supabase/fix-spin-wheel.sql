-- ============================================================
-- FIX spin_wheel (apply di SQL Editor production)
-- Bug: SELECT coins,energy,inventory INTO profiles%rowtype
--      mengisi BY POSITION → coins masuk ke kolom id (uuid)
--      → "invalid input syntax for type uuid: \"831450\""
-- ============================================================

create or replace function public.spin_wheel()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_coins int;
  v_energy int;
  v_inventory jsonb;
  v_last_spin text;
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
  v_coins_new int;
  v_energy_new int;
  v_inventory_new jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  -- PENTING: select ke variabel skalar, BUKAN profiles%rowtype
  select coins, energy, inventory, last_spin_date
    into v_coins, v_energy, v_inventory, v_last_spin
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    return jsonb_build_object('error', 'profile_not_found');
  end if;

  if v_last_spin is null or btrim(v_last_spin) = '' then
    last_str := null;
  elsif v_last_spin ~ '^\d{4}-\d{2}-\d{2}' then
    last_str := left(v_last_spin, 10);
  else
    last_str := null;
  end if;

  if last_str is not null and last_str = today_str then
    if coalesce(v_coins, 0) < 100 then
      return jsonb_build_object('error', 'insufficient_coins', 'coins', coalesce(v_coins, 0));
    end if;
    paid_spin := true;
    v_coins := v_coins - 100;
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

  v_coins_new := coalesce(v_coins, 0);
  v_energy_new := coalesce(v_energy, 0);
  v_inventory_new := coalesce(v_inventory, '{}'::jsonb);

  if is_coins then
    v_coins_new := v_coins_new + prize_count;
  elsif is_energy then
    v_energy_new := least(24, v_energy_new + prize_count);
  else
    v_inventory_new := jsonb_set(
      v_inventory_new,
      array[prize_id],
      to_jsonb(coalesce((v_inventory_new->>prize_id)::int, 0) + prize_count)
    );
  end if;

  update public.profiles
  set coins = v_coins_new,
      energy = v_energy_new,
      inventory = v_inventory_new,
      last_spin_date = today_str
  where id = v_user_id;

  return jsonb_build_object(
    'prize_id', prize_id,
    'prize_title', prize_title,
    'prize_count', prize_count,
    'is_coins', is_coins,
    'is_energy', is_energy,
    'paid', paid_spin,
    'coins_new', v_coins_new,
    'energy_new', v_energy_new,
    'inventory', v_inventory_new,
    'last_spin_date', today_str
  );
end; $$;

revoke all on function public.spin_wheel() from public;
grant execute on function public.spin_wheel() to authenticated;

-- verifikasi
select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'spin_wheel';
