create or replace function nutriai.sync_cookbook_cover_appearance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.cover_color_id := case new.cover_style
      when 'terracotta-cloth' then 'clay'
      when 'navy-leather' then 'midnight'
      when 'alabaster-linen' then 'alabaster'
      when 'charcoal-cloth' then 'charcoal'
      when 'umber-leather' then 'umber'
      else 'sage'
    end;
  elsif new.cover_color_id is distinct from old.cover_color_id
    and new.cover_style is not distinct from old.cover_style then
    new.cover_style := case new.cover_color_id
      when 'clay' then 'terracotta-cloth'
      when 'midnight' then 'navy-leather'
      when 'alabaster' then 'alabaster-linen'
      when 'charcoal' then 'charcoal-cloth'
      when 'umber' then 'umber-leather'
      else 'sage-linen'
    end;
  elsif new.cover_style is distinct from old.cover_style then
    new.cover_color_id := case new.cover_style
      when 'terracotta-cloth' then 'clay'
      when 'navy-leather' then 'midnight'
      when 'alabaster-linen' then 'alabaster'
      when 'charcoal-cloth' then 'charcoal'
      when 'umber-leather' then 'umber'
      else 'sage'
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_cookbook_cover_appearance on nutriai.cookbooks;
create trigger sync_cookbook_cover_appearance
before insert or update of cover_style, cover_color_id
on nutriai.cookbooks
for each row
execute function nutriai.sync_cookbook_cover_appearance();

comment on function nutriai.sync_cookbook_cover_appearance() is
  'Keeps the legacy cover_style adapter and canonical cover_color_id consistent across client versions.';
