# AI Scan Feature - Deployment Checklist

This checklist ensures all components are properly configured before releasing the AI Scan feature to users.

## Pre-Deployment

### ✅ Database Setup
- [ ] Run migration `20250106000000_ai_nutrition_scan.sql`
- [ ] Verify tables created: `food_logs`, `food_usda_mapping`, `food_synonyms`
- [ ] Seed initial food data (20+ common foods included)
- [ ] Test RLS policies work correctly
- [ ] Create `_cache` table for performance optimization
- [ ] Set up `meal-images` storage bucket (optional)

### ✅ Supabase Edge Function
- [ ] Deploy `ai-nutrition-scan` function
- [ ] Set `HUGGINGFACE_API_KEY` secret
- [ ] Test function with sample image
- [ ] Verify error handling works
- [ ] Check CORS headers configured
- [ ] Test cache functionality
- [ ] Monitor function logs for errors

### ✅ API Keys & Secrets
- [ ] Hugging Face API token generated
- [ ] USDA API key obtained (optional)
- [ ] Secrets set in Supabase (not in client .env)
- [ ] Test API rate limits
- [ ] Set up monitoring/alerts for API errors

### ✅ Frontend Integration
- [ ] `visionClient.ts` updated with new function
- [ ] `ExternalFoodLoggingModal.tsx` enhanced with AI UI
- [ ] `types/index.ts` extended with AI metadata
- [ ] `useNutrition.ts` includes Supabase sync
- [ ] Test image capture on iOS
- [ ] Test image capture on Android
- [ ] Verify UI shows confidence badges
- [ ] Test alternative food suggestions

### ✅ Data Quality
- [ ] Review seed data accuracy
- [ ] Add synonyms for common food variations
- [ ] Test with 10+ sample images
- [ ] Verify nutrition calculations correct
- [ ] Check portion estimates reasonable
- [ ] Validate confidence thresholds (>30%)

## Deployment Steps

### 1. Database Migration
```bash
# In project root
cd supabase
npx supabase db push

# Verify tables
npx supabase db remote --help
```

### 2. Deploy Edge Function
```bash
# Deploy function
npx supabase functions deploy ai-nutrition-scan

# Set secrets
npx supabase secrets set HUGGINGFACE_API_KEY=hf_xxxxx

# Test deployment
npx supabase functions invoke ai-nutrition-scan \
  --data '{"image_b64":"test"}'
```

### 3. App Build
```bash
# Clear cache
npx expo start --clear

# Test on physical devices
npx expo run:ios
npx expo run:android

# Create production build
eas build --platform all
```

### 4. Gradual Rollout (Recommended)

#### Phase 1: Internal Testing (Week 1)
- [ ] Enable for team members only
- [ ] Test with 50+ real meals
- [ ] Collect feedback on accuracy
- [ ] Monitor edge function performance
- [ ] Check database storage growth

#### Phase 2: Beta Users (Week 2-3)
- [ ] Enable for 10-20 beta users
- [ ] Add telemetry/analytics
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Iterate on synonym mappings

#### Phase 3: Public Release (Week 4+)
- [ ] Enable for all users
- [ ] Announce feature in app
- [ ] Monitor API costs
- [ ] Set up auto-scaling if needed
- [ ] Create user tutorial/guide

## Post-Deployment

### ✅ Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Monitor API response times
- [ ] Track daily scan volume
- [ ] Watch Hugging Face API quota
- [ ] Monitor Supabase database size
- [ ] Check edge function cold starts

### ✅ Analytics
```sql
-- Track feature adoption
SELECT 
  DATE(created_at) as date,
  COUNT(*) as scans,
  AVG(confidence)::numeric(10,2) as avg_confidence,
  COUNT(DISTINCT user_id) as unique_users
FROM food_logs
WHERE source = 'ai_scan'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Find low-confidence predictions
SELECT label, confidence, totals
FROM food_logs
WHERE source = 'ai_scan' AND confidence < 0.5
ORDER BY created_at DESC
LIMIT 20;

-- Most popular foods
SELECT label, COUNT(*) as count
FROM food_logs
WHERE source = 'ai_scan'
GROUP BY label
ORDER BY count DESC
LIMIT 20;
```

### ✅ Optimization
- [ ] Review cache hit rate (target: >60%)
- [ ] Add missing foods to USDA mapping
- [ ] Update synonyms based on user corrections
- [ ] Optimize image compression settings
- [ ] Consider CDN for faster API access

### ✅ User Support
- [ ] Create FAQ for AI Scan feature
- [ ] Add in-app tutorial/tips
- [ ] Set up support channel for feedback
- [ ] Document common issues
- [ ] Create video demo

## Testing Scenarios

### Happy Path
- [ ] User takes photo of pizza → Identified correctly
- [ ] User takes photo of salad → Identified correctly
- [ ] User takes photo of burger → Identified correctly
- [ ] Nutrition values are reasonable
- [ ] Confidence score shown
- [ ] Alternative suggestions appear

### Edge Cases
- [ ] Poor lighting → Fallback works
- [ ] Blurry image → Error message shown
- [ ] Unknown food → Suggest Search tab
- [ ] Multiple foods → Primary food identified
- [ ] No food in image → Appropriate error
- [ ] Image too large → Compressed automatically

### Error Handling
- [ ] Network offline → Graceful error
- [ ] API timeout → Retry logic works
- [ ] Invalid response → Fallback triggered
- [ ] Database unavailable → Local storage works
- [ ] Rate limit hit → User notified

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| API response time (P95) | < 2.0s | < 5.0s |
| Top-1 accuracy | > 85% | > 70% |
| Cache hit rate | > 60% | > 40% |
| Error rate | < 2% | < 5% |
| Confidence (avg) | > 0.75 | > 0.60 |

## Rollback Plan

If critical issues occur:

1. **Disable Feature**
   ```typescript
   // In ExternalFoodLoggingModal.tsx
   const AI_SCAN_ENABLED = false; // Quick disable
   ```

2. **Revert Database**
   ```sql
   -- Disable RLS to prevent writes
   ALTER TABLE food_logs DISABLE ROW LEVEL SECURITY;
   ```

3. **Pause Edge Function**
   ```bash
   # Delete function deployment
   npx supabase functions delete ai-nutrition-scan
   ```

4. **Notify Users**
   - In-app message: "AI Scan temporarily unavailable"
   - Guide users to Search/Manual tabs

## Cost Monitoring

### Free Tier Limits
- **Supabase**: 500MB database, 1GB storage, 50GB bandwidth
- **Hugging Face**: Rate limited, may have cold starts
- **USDA**: Unlimited free

### Cost Alerts
- [ ] Set up billing alerts at $5, $10, $25
- [ ] Monitor daily API usage
- [ ] Track storage growth
- [ ] Set up auto-scaling policies

## Documentation

- [ ] Update main README with AI Scan section
- [ ] Create user-facing help docs
- [ ] Document API endpoints
- [ ] Add code comments
- [ ] Create video tutorial
- [ ] Update env.example

## Success Criteria

Feature is considered successful if after 30 days:
- ✅ 30%+ of users try AI Scan at least once
- ✅ 10%+ of all food logs use AI Scan
- ✅ Average confidence score > 75%
- ✅ Error rate < 2%
- ✅ Positive user feedback (>4.0/5.0 rating)
- ✅ Operating costs < $50/month

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA Lead | | | |
| Product Owner | | | |
| DevOps | | | |

## Notes

_Add any deployment-specific notes, known issues, or special considerations here._

---

**Last Updated**: 2025-01-06  
**Version**: 1.0.0  
**Feature Flag**: `EXPO_PUBLIC_AI_SCAN_ENABLED`
