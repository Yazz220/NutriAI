# AI Scan Feature - Setup Guide

This guide walks through setting up the AI-powered food nutrition scanning feature in Nosh.

## Overview

The AI Scan feature allows users to take a photo of their meal and automatically receive:
- **Food identification** (using Food-101-93M model)
- **Calorie estimation** (via USDA FoodData Central)
- **Macro breakdown** (protein, carbs, fats)
- **Portion estimates** (e.g., "1 cup", "150g")
- **Confidence scores** (accuracy indication)
- **Alternative suggestions** (top-3 predictions)

## Architecture

```
User Photo → Supabase Edge Function → Food-101-93M → USDA Lookup → Nutrition Data
                                    ↓
                              Cache (24h) + Analytics (food_logs)
```

### Components

1. **Database Tables** (`supabase/migrations/20250106000000_ai_nutrition_scan.sql`)
   - `food_logs`: Stores AI scan results
   - `food_usda_mapping`: Maps food labels to USDA nutrition data
   - `food_synonyms`: Handles food name variations

2. **Edge Function** (`supabase/functions/ai-nutrition-scan/index.ts`)
   - Validates and processes images
   - Calls Food-101-93M via Hugging Face Inference API
   - Looks up nutrition data from USDA mapping
   - Returns structured JSON response

3. **Frontend** 
   - `utils/visionClient.ts`: Client-side API wrapper
   - `components/nutrition/ExternalFoodLoggingModal.tsx`: UI for scanning
   - `hooks/useNutrition.ts`: Data persistence and sync

## Prerequisites

1. **Supabase Account** (free tier works)
2. **Hugging Face Account** (free tier works)
3. **USDA FoodData Central API Key** (optional, free)

## Setup Instructions

### 1. Database Setup

Run the migration to create required tables:

```bash
cd supabase
npx supabase db push
```

Or manually run the migration:
```sql
-- In Supabase SQL Editor
\i supabase/migrations/20250106000000_ai_nutrition_scan.sql
```

### 2. Hugging Face API Setup

1. Sign up at [Hugging Face](https://huggingface.co/join)
2. Generate an API token:
   - Go to [Settings > Access Tokens](https://huggingface.co/settings/tokens)
   - Click "New token"
   - Name: "nosh-food-classifier"
   - Role: "Read"
   - Copy the token (starts with `hf_`)

3. Add to Supabase Edge Function secrets:
```bash
npx supabase secrets set HUGGINGFACE_API_KEY=hf_your_token_here
```

### 3. Deploy Edge Function

```bash
# Deploy the ai-nutrition-scan function
npx supabase functions deploy ai-nutrition-scan

# Verify deployment
npx supabase functions list
```

### 4. Storage Bucket Setup (Optional)

For storing meal images:

1. Go to Supabase Dashboard → Storage
2. Create new bucket:
   - Name: `meal-images`
   - Public: **No** (private)
3. Set up RLS policies (see migration file comments)

### 5. Environment Variables

No client-side env vars needed! Everything runs through Supabase.

The edge function uses these secrets (set via `npx supabase secrets set`):
- `HUGGINGFACE_API_KEY` - Required for Food-101-93M
- `USDA_API_KEY` - Optional for enhanced nutrition data
- `SUPABASE_URL` - Auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided by Supabase

## Testing

### 1. Test Edge Function Directly

```bash
# Test with a sample image
curl -X POST https://your-project.supabase.co/functions/v1/ai-nutrition-scan \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image_b64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  }'
```

Expected response:
```json
{
  "items": [
    {
      "label": "pizza",
      "score": 0.95,
      "canonical_label": "pizza"
    }
  ],
  "totals": {
    "calories": 285,
    "protein": 11.8,
    "carbohydrates": 35.3,
    "fat": 10.7,
    "portion_text": "1 slice",
    "grams_total": 107
  },
  "model_version": "food-101-93m@v1",
  "mapping_version": "usda-map@2025-01",
  "cached": false
}
```

### 2. Test in App

1. Open Nosh app
2. Navigate to any meal logging screen
3. Tap **AI Scan** tab
4. Take a photo of food
5. Wait for analysis (~1-3 seconds)
6. Verify results show:
   - Food name
   - Confidence percentage
   - Nutrition facts
   - Alternative suggestions (if any)

## Troubleshooting

### "AI nutrition scan endpoint not configured"

**Cause**: `EXPO_PUBLIC_SUPABASE_URL` not set in `.env`

**Fix**:
```bash
# In your .env file
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### "Classification failed (401)"

**Cause**: Invalid or missing Hugging Face API key

**Fix**:
```bash
# Check current secrets
npx supabase secrets list

# Set/update the key
npx supabase secrets set HUGGINGFACE_API_KEY=hf_your_real_token
```

### "No nutrition data found for: [food]"

**Cause**: Food not in `food_usda_mapping` table

**Fix**: Add the food to the mapping table:
```sql
INSERT INTO food_usda_mapping (
  label, fdc_id, calories, protein, carbohydrates, fat, 
  default_grams, default_portion_text
) VALUES (
  'food_name', '123456', 250, 10.0, 30.0, 8.0, 100, '1 serving'
);
```

Or add a synonym if it's a variation:
```sql
INSERT INTO food_synonyms (alias, canonical_label) 
VALUES ('user_food_name', 'existing_canonical_label');
```

### "Model is loading" or slow response

**Cause**: Hugging Face Inference API cold start

**Fix**: 
- Wait 10-20 seconds for model to warm up
- First request after inactivity is slower
- Subsequent requests use cache and are faster

### Cache not working

**Cause**: Missing `_cache` table

**Fix**: Create cache table:
```sql
CREATE TABLE IF NOT EXISTS _cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_cache_expires ON _cache(expires_at);
```

## Performance Optimization

### 1. Enable Caching

The edge function caches results for 24 hours by image hash. Ensure the `_cache` table exists.

### 2. Batch Seed USDA Data

For better coverage, seed more foods:

```bash
# Download USDA bulk data
curl -o usda_foods.json https://api.nal.usda.gov/fdc/v1/foods/list?api_key=YOUR_KEY

# Import to Supabase (use your preferred method)
# Or manually add via SQL Editor
```

### 3. Monitor Usage

Track AI scan usage:

```sql
-- Daily scan count
SELECT DATE(created_at) as date, COUNT(*) as scans
FROM food_logs
WHERE source = 'ai_scan'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Average confidence by food
SELECT label, AVG(confidence)::numeric(10,2) as avg_confidence, COUNT(*) as count
FROM food_logs
WHERE source = 'ai_scan'
GROUP BY label
ORDER BY count DESC
LIMIT 20;
```

## Cost Estimate

All services offer free tiers:

| Service | Free Tier | Estimated Cost |
|---------|-----------|----------------|
| Supabase | 500MB database, 1GB storage | $0 (within limits) |
| Hugging Face Inference | Rate limited, cold starts | $0 (free tier) |
| USDA FoodData Central | Unlimited requests | $0 (free forever) |

**Total**: $0/month for up to ~1000 scans/month

For production scale:
- Upgrade Supabase to Pro ($25/mo) for better performance
- Consider self-hosting Food-101-93M for faster response

## Advanced Configuration

### Custom Food Database

To use your own nutrition database instead of USDA:

1. Modify `food_usda_mapping` schema to match your data
2. Update edge function `lookupNutrition()` to query your table
3. Adjust `computeNutritionTotals()` if needed

### Multi-Food Detection

To detect multiple foods in one image:

1. Update edge function to process all top-k results (not just top-1)
2. Sum nutrition for all detected items
3. Update frontend to display multiple items

### Portion Adjustment UI

Add a slider to adjust portions:

```typescript
const [portionMultiplier, setPortionMultiplier] = useState(1);

// In nutrition display
<Text>Calories: {aiResult.totals.calories * portionMultiplier}</Text>

// Slider
<Slider
  minimumValue={0.5}
  maximumValue={2.0}
  step={0.25}
  value={portionMultiplier}
  onValueChange={setPortionMultiplier}
/>
```

## Support

For issues or questions:
1. Check [Supabase Logs](https://supabase.com/dashboard/project/_/logs)
2. Review edge function logs: `npx supabase functions logs ai-nutrition-scan`
3. Check Hugging Face API status: https://status.huggingface.co/

## Next Steps

- [ ] Add more foods to USDA mapping (see `food_usda_mapping` table)
- [ ] Create admin dashboard for synonym management
- [ ] Implement user feedback loop for incorrect predictions
- [ ] Add portion size estimation using depth perception
- [ ] Train custom model on user data for improved accuracy

## License

This feature uses:
- **Food-101-93M**: MIT License
- **USDA FoodData Central**: Public domain (U.S. Government)
- **Hugging Face Inference API**: See [Hugging Face Terms](https://huggingface.co/terms-of-service)
