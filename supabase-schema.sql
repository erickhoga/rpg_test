-- Execute no SQL Editor do mesmo projeto Supabase usado pelos outros jogos.
create table if not exists public.rpg_characters (
 name text primary key check (name ~ '^[a-z0-9_-]{3,20}$'),
 state jsonb not null check (octet_length(state::text) < 100000),
 revision bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.rpg_characters enable row level security;
drop policy if exists "Leitura por nome compartilhado" on public.rpg_characters;
create policy "Leitura por nome compartilhado" on public.rpg_characters for select to anon using (true);
grant select on public.rpg_characters to anon;
revoke insert,update,delete on public.rpg_characters from anon,authenticated;
create or replace function public.rpg_save(p_name text,p_state jsonb,p_revision bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_revision bigint;
begin
 if p_name !~ '^[a-z0-9_-]{3,20}$' or p_state->>'name' is distinct from p_name then
  raise exception 'Nome inválido';
 end if;
 if p_revision=0 then
  insert into public.rpg_characters(name,state) values(p_name,p_state)
  on conflict do nothing returning revision into v_revision;
 else
  update public.rpg_characters set state=p_state,revision=revision+1,updated_at=now()
  where name=p_name and revision=p_revision returning revision into v_revision;
 end if;
 if v_revision is null then raise sqlstate 'PT409' using message='Personagem atualizado em outro dispositivo'; end if;
 return v_revision;
end; $$;
revoke all on function public.rpg_save(text,jsonb,bigint) from public;
grant execute on function public.rpg_save(text,jsonb,bigint) to anon;
