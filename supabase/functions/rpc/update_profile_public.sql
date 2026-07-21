-- RPC: update_profile_public — hanya izinkan kolom profil non-ekonomi
-- Mutasi coins, energy, level, score, inventory, dll ditolak.
create or replace function update_profile_public(
  p_username text default null,
  p_avatar_url text default null,
  p_nickname text default null,
  p_bio text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles set
    username   = coalesce(p_username, username),
    avatar_url = coalesce(p_avatar_url, avatar_url),
    nickname   = coalesce(p_nickname, nickname),
    bio        = coalesce(p_bio, bio),
    updated_at = now()
  where id = uid;

  return jsonb_build_object('success', true);
end; $$;
