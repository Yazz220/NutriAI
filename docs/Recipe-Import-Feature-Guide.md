# Recipe Import Feature Guide

## Overview
The Recipe Import feature allows users to import recipes from various sources including:
- **Text**: Copy and paste recipe text
- **Links**: Import from recipe websites (with CORS limitations)
- **Images**: Extract recipes from photos (coming soon)
- **Videos**: Import from TikTok, Instagram, YouTube (coming soon)

## How to Use

### Importing from Text
1. Tap the floating "+" button in the Recipes tab
2. Select "Text" from the options
3. Paste or type your recipe in the following format:

```
Recipe Name

Ingredients:
- 2 cups flour
- 1 cup sugar
- 3 eggs
- 1/2 cup butter

Instructions:
1. Preheat oven to 350°F
2. Mix dry ingredients
3. Add wet ingredients
4. Bake for 30 minutes
```

### Importing from Links
1. Tap the floating "+" button
2. Select "Link"
3. Paste the recipe URL
4. The app will attempt to extract recipe data

**Note**: Due to CORS restrictions in the browser/mobile environment, some websites may not work directly. If you encounter an error, try copying the recipe text instead.

### Supported Recipe Websites
The system can automatically detect and parse recipes from:
- AllRecipes
- Food Network
- Bon Appétit
- Serious Eats
- BBC Good Food
- Simply Recipes
- And many more...

## Technical Implementation

### Architecture
```
User Input → Detection → Extraction → Parsing → Storage
```

### Components
1. **ImportRecipeModal** (`components/ImportRecipeModal.tsx`)
   - User interface for recipe import
   - Supports multiple input modes
   - Validates and processes input

2. **Input Detection** (`utils/inputDetection.ts`)
   - Automatically detects content type
   - Identifies platforms (TikTok, Instagram, etc.)
   - Provides parsing hints

3. **Recipe Import** (`utils/recipeImport.ts`)
   - Core import logic
   - HTML parsing for websites
   - Text parsing for pasted recipes
   - Converts to app's recipe format

4. **Recipe Storage**
   - Imported recipes are saved as Meals
   - Integrated with existing recipe system
   - Can be added to folders and collections

## Features

### Current Features
✅ Text recipe import
✅ Basic URL import (with limitations)
✅ Recipe parsing from structured data
✅ Ingredient and instruction extraction
✅ Integration with recipe folders
✅ Floating action button UI

### Upcoming Features
🚧 Image OCR for recipe cards
🚧 Video transcription and extraction
🚧 AI-powered recipe enhancement
🚧 Nutrition calculation
🚧 Batch import
🚧 Recipe deduplication

## Known Limitations

1. **CORS Issues**: Direct URL fetching may not work for all websites due to browser security. Workaround: Copy and paste the recipe text.

2. **Structured Data**: Best results are achieved with websites that use Recipe schema markup.

3. **Complex Formats**: Some recipe formats may require manual cleanup after import.

## Troubleshooting

### "Unable to fetch from this URL"
- This is usually due to CORS restrictions
- Solution: Visit the website, copy the recipe text, and use the "Text" import option

### "No recipe found"
- The website may not have structured recipe data
- Solution: Copy the recipe text manually

### Missing Information
- Some imported recipes may lack certain details
- You can edit the recipe after import to add missing information

## Future Enhancements

### Phase 2: Advanced Processing
- OCR for recipe images
- Video content extraction
- AI-powered parsing

### Phase 3: Smart Features
- Automatic nutrition calculation
- Recipe similarity detection
- Ingredient substitution suggestions
- Multi-language support

## API Integration

For production deployment, consider:
1. Setting up a backend service for URL fetching (avoids CORS)
2. Integrating OCR services (Google Vision, AWS Textract)
3. Adding video processing APIs
4. Implementing AI enhancement with GPT-4 or similar

## Testing

### Test Recipe (Text Format)
```
Chocolate Chip Cookies

Ingredients:
- 2 1/4 cups all-purpose flour
- 1 tsp baking soda
- 1 tsp salt
- 1 cup butter, softened
- 3/4 cup granulated sugar
- 3/4 cup packed brown sugar
- 2 large eggs
- 2 tsp vanilla extract
- 2 cups chocolate chips

Instructions:
1. Preheat oven to 375°F.
2. In a bowl, combine flour, baking soda and salt.
3. In another bowl, cream butter and sugars until fluffy.
4. Beat in eggs and vanilla.
5. Gradually blend in flour mixture.
6. Stir in chocolate chips.
7. Drop by rounded tablespoons onto ungreased cookie sheets.
8. Bake 9-11 minutes or until golden brown.
9. Cool on baking sheet for 2 minutes before removing.
```

## Support

For issues or feature requests related to the Recipe Import feature, please check the troubleshooting section above or create an issue in the project repository.
