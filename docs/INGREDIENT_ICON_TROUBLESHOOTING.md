# Ingredient Icon Troubleshooting Guide

## Issue: Images Generated But Not Displaying

### Problem
Icons are being generated successfully by the Hugging Face FLUX.1-schnell model, but they're not appearing in the app UI.

### Enhanced Logging (Added)

**File:** `components/common/IngredientIcon.tsx`

Added comprehensive logging to track:
1. **Icon fetch status**: Shows whether icon is ready or pending
2. **URL presence**: Confirms if image URL exists
3. **Image load success**: Logs when image successfully loads
4. **Image load errors**: Catches and logs any image loading failures
5. **Fetch errors**: Logs API errors during icon retrieval

### What to Look For in Terminal

After the changes, you should see logs like:

```
🔍 Fetching ingredient icon: {"slug": "tomato", "displayName": "Tomato", "forceRegenerate": false}
📡 API Response status: 200
✅ API Response body: {"status": "ready", "image_url": "https://...", "slug": "tomato"}
🔄 Icon status for "tomato": ready URL present
✅ Image loaded successfully: tomato https://...
```

### Common Issues & Solutions

#### 1. Image URL Returns But Image Doesn't Load
**Symptoms:**
```
🔄 Icon status for "tomato": ready URL present
❌ Image load error for tomato: [error details]
```

**Possible Causes:**
- CORS issue with Supabase storage
- Invalid image format
- Network connectivity issue
- Image URL expired or inaccessible

**Solution:**
- Check Supabase storage bucket permissions (should be public)
- Verify image URL is accessible in browser
- Check if storage bucket has CORS enabled

#### 2. Status Stuck on "pending"
**Symptoms:**
```
🔄 Icon status for "tomato": pending No URL
🔄 Icon status for "tomato": pending No URL
...
```

**Possible Causes:**
- Image generation failed
- Database not updated after generation
- Worker function not running

**Solution:**
- Check Supabase function logs for errors
- Verify `HUGGINGFACE_API_KEY` is set correctly
- Check if Hugging Face Pro subscription is active
- Manually check database for the icon entry

#### 3. Fetch Errors
**Symptoms:**
```
❌ Icon fetch error for "tomato": [error]
```

**Possible Causes:**
- API endpoint unreachable
- Authentication failure
- Network timeout

**Solution:**
- Verify `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`
- Check internet connection
- Verify Supabase project is running

### Testing Steps

1. **Clear App Cache:**
   ```bash
   # Stop Expo
   # Restart with cache clear
   npx expo start --clear
   ```

2. **Add New Ingredient:**
   - Add a completely new ingredient (not previously added)
   - Watch terminal for logs
   - Should see generation + loading sequence

3. **Check Existing Ingredient:**
   - Add an ingredient that was generated earlier
   - Should immediately show "ready" status
   - Should load from cache

4. **Force Regenerate:**
   - Modify `iconApi.ts` to pass `force_regenerate: true`
   - Will regenerate even if exists

### Database Check

To verify icons in database:

```sql
-- Check all generated icons
SELECT slug, status, image_url, model, prompt_version, updated_at
FROM nutriai.ingredient_icons
ORDER BY updated_at DESC
LIMIT 10;

-- Check specific ingredient
SELECT * FROM nutriai.ingredient_icons WHERE slug = 'tomato';
```

### Storage Bucket Check

1. Go to Supabase Dashboard
2. Navigate to Storage → `ingredient-icons` bucket
3. Check if images exist
4. Verify bucket is **public**
5. Test image URL directly in browser

### Current Configuration

**Model:** `black-forest-labs/FLUX.1-schnell`  
**Provider:** Hugging Face Pro  
**Prompt Version:** 5  
**Prompt Style:** Marker illustration, editorial food art  
**Storage:** Supabase Storage (`ingredient-icons` bucket)  
**Database:** `nutriai.ingredient_icons` table

### Expected Flow

1. **User adds ingredient** → Component mounts
2. **Component calls API** → `fetchIngredientIcon(slug)`
3. **API checks database** → If exists with `status: 'ready'`, return URL
4. **If not exists** → Create pending entry, trigger generation
5. **Generation completes** → Update database with URL
6. **Component polls** → Checks every 1 second for up to 15 seconds
7. **Status becomes ready** → Component displays image
8. **Image loads** → Success log appears

### Debug Commands

```bash
# Check Supabase function logs
npx supabase functions logs get-ingredient-icon --project-ref wckohtwftlwhyldnfpbz

# Check secrets
npx supabase secrets list --project-ref wckohtwftlwhyldnfpbz

# Redeploy functions
npx supabase functions deploy get-ingredient-icon --project-ref wckohtwftlwhyldnfpbz
```

### Next Steps

1. **Restart Expo** with the new logging
2. **Add an ingredient** and watch terminal closely
3. **Share the logs** if issue persists
4. **Check Supabase dashboard** for generated images

The enhanced logging will help pinpoint exactly where the issue is occurring!
