create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.video_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'Video',
  release_year integer,
  poster_url text not null,
  video_url text not null,
  published boolean not null default true,
  created_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  content_type text not null default 'movie',
  series_title text,
  season_number integer,
  episode_number integer,
  featured boolean not null default false
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_post_id uuid not null references public.video_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_post_id)
);

create table if not exists public.watch_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_post_id uuid not null references public.video_posts(id) on delete cascade,
  progress_seconds integer not null default 0 check (progress_seconds >= 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, video_post_id)
);

create table if not exists public.video_analytics (
  id bigint generated always as identity primary key,
  video_post_id uuid references public.video_posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('view','play','complete','share','report','open_source')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.search_analytics (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  query text not null,
  result_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists video_analytics_event_created_idx on public.video_analytics(event_type, created_at desc);
create index if not exists video_analytics_post_idx on public.video_analytics(video_post_id);
create index if not exists search_analytics_query_idx on public.search_analytics(lower(query));
create index if not exists watch_history_updated_idx on public.watch_history(user_id, updated_at desc);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.admins where user_id=auth.uid()); $$;
grant execute on function public.is_admin() to authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.user_profiles(user_id, display_name)
  values(new.id, coalesce(new.raw_user_meta_data->>'display_name',''))
  on conflict(user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.create_profile_for_new_user();

alter table public.admins enable row level security;
alter table public.video_posts enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_favorites enable row level security;
alter table public.watch_history enable row level security;
alter table public.video_analytics enable row level security;
alter table public.search_analytics enable row level security;

drop policy if exists "Public read published" on public.video_posts;
create policy "Public read published" on public.video_posts for select to anon,authenticated using(published=true);
drop policy if exists "Admin read all" on public.video_posts;
create policy "Admin read all" on public.video_posts for select to authenticated using(public.is_admin());
drop policy if exists "Admin insert" on public.video_posts;
create policy "Admin insert" on public.video_posts for insert to authenticated with check(public.is_admin());
drop policy if exists "Admin update" on public.video_posts;
create policy "Admin update" on public.video_posts for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "Admin delete" on public.video_posts;
create policy "Admin delete" on public.video_posts for delete to authenticated using(public.is_admin());

create policy "Users read own profile" on public.user_profiles for select to authenticated using(user_id=auth.uid());
create policy "Users insert own profile" on public.user_profiles for insert to authenticated with check(user_id=auth.uid());
create policy "Users update own profile" on public.user_profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "Admins read profiles" on public.user_profiles for select to authenticated using(public.is_admin());

create policy "Users manage own favorites" on public.user_favorites for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "Admins read favorites" on public.user_favorites for select to authenticated using(public.is_admin());

create policy "Users manage own history" on public.watch_history for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "Admins read history" on public.watch_history for select to authenticated using(public.is_admin());

create policy "Anyone insert video analytics" on public.video_analytics for insert to anon,authenticated
with check(user_id is null or user_id=auth.uid());
create policy "Admins read video analytics" on public.video_analytics for select to authenticated using(public.is_admin());

create policy "Anyone insert search analytics" on public.search_analytics for insert to anon,authenticated
with check(user_id is null or user_id=auth.uid());
create policy "Admins read search analytics" on public.search_analytics for select to authenticated using(public.is_admin());

create or replace function public.admin_analytics_summary()
returns jsonb language sql stable security definer set search_path=public
as $$
  select case when public.is_admin() then jsonb_build_object(
    'total_users',(select count(*) from public.user_profiles),
    'total_views',(select count(*) from public.video_analytics where event_type='view'),
    'total_plays',(select count(*) from public.video_analytics where event_type='play'),
    'total_completes',(select count(*) from public.video_analytics where event_type='complete'),
    'total_favorites',(select count(*) from public.user_favorites),
    'total_searches',(select count(*) from public.search_analytics)
  ) else '{}'::jsonb end;
$$;

create or replace function public.admin_top_videos(row_limit integer default 8)
returns table(video_post_id uuid,title text,play_count bigint)
language sql stable security definer set search_path=public
as $$
  select vp.id,vp.title,count(va.id)
  from public.video_posts vp
  join public.video_analytics va on va.video_post_id=vp.id and va.event_type='play'
  where public.is_admin()
  group by vp.id,vp.title order by count(va.id) desc limit greatest(row_limit,1);
$$;

create or replace function public.admin_top_searches(row_limit integer default 8)
returns table(query text,search_count bigint)
language sql stable security definer set search_path=public
as $$
  select lower(trim(sa.query)),count(*)
  from public.search_analytics sa
  where public.is_admin() and trim(sa.query)<>''
  group by lower(trim(sa.query)) order by count(*) desc limit greatest(row_limit,1);
$$;

grant execute on function public.admin_analytics_summary() to authenticated;
grant execute on function public.admin_top_videos(integer) to authenticated;
grant execute on function public.admin_top_searches(integer) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('posters','posters',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public view posters" on storage.objects;
drop policy if exists "Admin upload posters" on storage.objects;
drop policy if exists "Admin delete posters" on storage.objects;
create policy "Public view posters" on storage.objects for select to public using(bucket_id='posters');
create policy "Admin upload posters" on storage.objects for insert to authenticated with check(bucket_id='posters' and public.is_admin());
create policy "Admin delete posters" on storage.objects for delete to authenticated using(bucket_id='posters' and public.is_admin());

-- After creating your first admin account, replace USER_UUID:
-- insert into public.admins(user_id) values('USER_UUID');
