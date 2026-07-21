-- View: public_profile_view — data publik untuk leaderboard/profil orang lain
create or replace view public.public_profile_view as
select
  id,
  username,
  score,
  level,
  avatar_url,
  nickname,
  selected_avatar
from public.profiles;

-- Policy view: semua orang bisa lihat
drop policy if exists "public_profile_view_select" on public.public_profile_view;
create policy "public_profile_view_select" on public.public_profile_view
  for select using (true);
