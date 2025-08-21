# Video Import Setup Guide

This guide explains how to configure and troubleshoot video import functionality for TikTok Reels and other social media cooking videos.

## 🎥 Video Import Features

The app supports importing recipes from:
- **TikTok Reels** (recommended)
- **Instagram Reels**
- **YouTube Shorts**
- **Facebook Videos**
- **Local video files**

## 🔧 Environment Configuration

### Required Environment Variables

Add these to your `.env` file:

```env
# Speech-to-Text Service Configuration
# Get API key from: https://groq.com/ or similar providers
EXPO_PUBLIC_STT_API_BASE=https://api.groq.com/v1
EXPO_PUBLIC_STT_API_KEY=your_api_key_here

# Alternative providers:
# OpenAI: EXPO_PUBLIC_STT_API_BASE=https://api.openai.com/v1
# Groq:   EXPO_PUBLIC_STT_API_BASE=https://api.groq.com/v1
# Lemonfox: EXPO_PUBLIC_STT_API_BASE=https://api.lemonfox.ai/v1
```

### API Provider Options

| Provider | Base URL | Sign Up | Notes |
|----------|----------|---------|-------|
| **Groq** | `https://api.groq.com/v1` | [groq.com](https://groq.com) | Fast, affordable, good for development |
| **OpenAI** | `https://api.openai.com/v1` | [openai.com](https://openai.com) | High quality, more expensive |
| **Lemonfox** | `https://api.lemonfox.ai/v1` | [lemonfox.ai](https://lemonfox.ai) | Supports direct URL transcription |

## 🚨 Common Issues & Solutions

### Issue: "Speech-to-Text is not configured"

**Error Message:**
```
Speech-to-Text is not configured. Set EXPO_PUBLIC_STT_API_BASE and EXPO_PUBLIC_STT_API_KEY in your environment variables.
```

**Solutions:**
1. Add the required environment variables to your `.env` file
2. Get an API key from one of the supported providers
3. Restart the app after adding environment variables

### Issue: "401 Unauthorized" or "Invalid API Key"

**Error Message:**
```
Speech-to-Text service authentication failed. Please check your EXPO_PUBLIC_STT_API_KEY.
```

**Solutions:**
1. Verify your API key is correct
2. Ensure you're using the right base URL for your provider
3. Check that your API key has sufficient credits/permissions
4. Rotate your API key if it may have been compromised

### Issue: "400 Bad Request" or "Invalid video URL"

**Error Message:**
```
Invalid video URL or format. Please try a different video or paste the recipe text instead.
```

**Solutions:**
1. Ensure the video URL is publicly accessible
2. Try a different video from the same platform
3. Some platforms may block automated access - try a different video
4. Consider using the text import option instead

### Issue: "No transcript" or "No meaningful transcript extracted"

**Error Message:**
```
No audio could be extracted from the video. Please try:
• A video with clearer speech
• A different video URL
• Pasting the recipe text manually
```

**Solutions:**
1. Choose videos with clear, audible speech
2. Avoid videos with background music over the narration
3. Try videos with spoken instructions rather than just text overlays
4. Use the text import option for videos with visible recipe text

### Issue: "Insufficient video evidence"

**Error Message:**
```
Video quality is too low for automatic processing. Please try:
• A video with clearer audio
• A video with visible text/captions
• Pasting the recipe text manually
```

**Solutions:**
1. Look for videos with both clear speech AND visible recipe text
2. Videos with captions/subtitles work best
3. Avoid very short clips (< 30 seconds) unless they contain complete recipes
4. Consider using multiple videos for complex recipes

## 📱 Platform-Specific Tips

### TikTok Reels
- **Best results**: Reels with clear voiceover + text overlays
- **Captions**: Many TikTok videos have auto-generated captions
- **URL format**: `https://www.tiktok.com/@username/video/1234567890`

### Instagram Reels
- **Best results**: Reels with detailed captions
- **Challenges**: Instagram often blocks automated access
- **Alternative**: Use text import with caption text

### YouTube Shorts
- **Best results**: Shorts with clear narration
- **Captions**: Check for closed captions availability
- **URL format**: `https://www.youtube.com/shorts/abc123`

## 🔍 Testing Video Import

### Test URLs
Try these publicly available cooking videos:

**TikTok (Good examples):**
- Videos with clear speech and text overlays
- Recipe tutorials with step-by-step instructions
- Food preparation videos with ingredient lists

**YouTube Shorts:**
- Quick recipe demos
- Simple cooking techniques
- Ingredient spotlight videos

### Testing Steps

1. **Test Environment Variables:**
   ```bash
   # Check if variables are loaded
   console.log(process.env.EXPO_PUBLIC_STT_API_BASE)
   console.log(process.env.EXPO_PUBLIC_STT_API_KEY ? 'KEY_SET' : 'KEY_MISSING')
   ```

2. **Test API Connectivity:**
   ```bash
   # In browser console, test API endpoint
   fetch('https://api.groq.com/v1/models', {
     headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
   }).then(r => r.json()).then(console.log)
   ```

3. **Test Video Import:**
   - Start with simple, clear videos
   - Check console logs for detailed error messages
   - Use browser developer tools to monitor network requests

## 🛠️ Troubleshooting Steps

### 1. Check Environment Configuration
```bash
# Verify .env file exists and contains:
cat .env | grep STT
# Should show:
# EXPO_PUBLIC_STT_API_BASE=https://api.groq.com/v1
# EXPO_PUBLIC_STT_API_KEY=your_key_here
```

### 2. Restart Development Server
```bash
# Stop current server (Ctrl+C)
# Clear cache and restart
npx expo start --clear
```

### 3. Check API Key Validity
```bash
# Test API key with curl
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.groq.com/v1/models
```

### 4. Test with Different Videos
- Try multiple videos from the same platform
- Test with different platforms (TikTok → YouTube)
- Use shorter videos (30-60 seconds) for testing

### 5. Check Console Logs
Look for detailed error messages in:
- Browser developer console (web version)
- Metro bundler console (native apps)
- App logs in development mode

### 6. Network Issues
- Ensure stable internet connection
- Check if API endpoints are accessible
- Verify no firewall/proxy blocking requests

## 📊 Performance Optimization

### Video Processing Tips

1. **File Size Limits:**
   - Keep videos under 50MB for best performance
   - Use shorter clips (30-60 seconds) when possible
   - Compress videos before importing if needed

2. **Audio Quality:**
   - Clear speech with minimal background noise
   - Avoid music tracks over narration
   - Good microphone quality in source video

3. **Content Quality:**
   - Videos with both speech AND visible text perform best
   - Look for videos with ingredient lists
   - Step-by-step instruction videos work well

### API Rate Limiting

Most STT providers have rate limits:
- **Groq**: Generous free tier, good for development
- **OpenAI**: Pay-per-use, higher quality
- **Lemonfox**: Direct URL support, may have fewer restrictions

## 🔄 Fallback Strategies

When video import fails, the app provides these alternatives:

1. **Text Import**: Paste recipe text directly
2. **Image Import**: Use screenshots of recipes
3. **URL Scraping**: Try web-based recipe URLs
4. **Manual Entry**: Add recipes manually

## 📝 Support Information

If issues persist:

1. **Check app version** - Ensure you're on the latest version
2. **Review error messages** - Look for specific error codes
3. **Test with simple content** - Start with basic videos
4. **Contact support** - Provide console logs and error messages

## 🎯 Best Practices

### For Content Creators
- Speak clearly and at moderate pace
- Show ingredients on screen when mentioned
- Use good lighting for text visibility
- Include complete recipes in single videos

### For Users
- Choose videos with clear audio and visible text
- Try multiple videos if one doesn't work
- Use text import as backup option
- Check video captions/subtitles when available

This comprehensive setup ensures reliable video import functionality across different platforms and content types.