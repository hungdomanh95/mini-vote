create extension if not exists "pgcrypto";

create table polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  slug text unique not null,
  allow_multiple boolean not null default false,
  max_selections int,
  status text not null default 'active',
  show_result_after_vote boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  label text not null,
  image_url text,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  voter_name text not null,
  voter_token text,
  created_at timestamptz not null default now()
);

create table vote_selections (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid not null references votes(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete restrict,
  unique(vote_id, option_id)
);

create index idx_polls_slug on polls(slug);
create index idx_poll_options_poll_id on poll_options(poll_id);
create index idx_votes_poll_id on votes(poll_id);
create index idx_votes_poll_token on votes(poll_id, voter_token);
create index idx_vote_selections_option_id on vote_selections(option_id);

create unique index unique_vote_token_per_poll
on votes(poll_id, voter_token)
where voter_token is not null;
