-- SH-01: spin_wheel RPC — server-side prize random
-- Deploy ke Supabase SQL Editor

create or replace function spin_wheel()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  p profiles%rowtype;
  uid uuid := auth.uid();
  today_str text := to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM-DD');
  r float := random() * 100;
  cumulative float := 0;
  prize_id text;
  prize_count int;
  prize_title text;
  is_coins bool := false;
  is_energy bool := false;
  paid_spin bool := false;
  -- Weights harus match SPIN_PRIZES di Dashboard.tsx
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
  select * into p from profiles where id = uid for update;

  -- Cek gratis atau bayar
  if p.last_spin_date = today_str then
    -- Paid spin — cek koin cukup
    if coalesce(p.coins, 0) < 100 then
      return jsonb_build_object('error', 'insufficient_coins');
    end if;
    paid_spin := true;
    update profiles set coins = coins - 100 where id = uid;
  end if;

  -- Pick prize server-side
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

  -- Apply prize
  if is_coins then
    update profiles set coins = coins + prize_count where id = uid;
  elsif is_energy then
    update profiles set energy = least(24, coalesce(energy,0) + prize_count) where id = uid;
  else
    update profiles set
      inventory = jsonb_set(
        coalesce(inventory, '{}'::jsonb),
        array[prize_id],
        to_jsonb(coalesce((inventory->>prize_id)::int, 0) + prize_count)
      )
    where id = uid;
  end if;

  -- Update last_spin_date kalau free spin
  if not paid_spin then
    update profiles set last_spin_date = today_str where id = uid;
  end if;

  -- Fetch updated profile
  select coins, energy, inventory into p from profiles where id = uid;

  return jsonb_build_object(
    'prize_id',    prize_id,
    'prize_title', prize_title,
    'prize_count', prize_count,
    'is_coins',    is_coins,
    'is_energy',   is_energy,
    'paid',        paid_spin,
    'coins_new',   p.coins,
    'energy_new',  p.energy,
    'inventory',   p.inventory
  );
end; $$;
