-- Raise the Folio Plus monthly designed-page allowance for both future and
-- already-open subscription periods. Usage rows are period snapshots, so the
-- catalog update alone would not benefit a subscriber until their next reset.

update nutriai.subscription_plan_features
set allowance = 40,
    updated_at = now()
where plan_id = 'plus'
  and feature_key = 'designed_pages';

update nutriai.usage_periods
set allowance = 40,
    updated_at = now()
where plan_id = 'plus'
  and meter_key = 'designed_pages'
  and period_end is not null
  and period_end > now();
