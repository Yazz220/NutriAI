-- Keep plan presentation aligned with the current Folio product name.
-- Stable provider identifiers, product IDs, and entitlement IDs remain unchanged.
update nutriai.subscription_plans
set display_name = case id
  when 'free' then 'Folio Free'
  when 'plus' then 'Folio Plus'
  else display_name
end
where id in ('free', 'plus');
