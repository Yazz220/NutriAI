# Enhanced Universal Recipe Import System

## Overview

The Enhanced Universal Recipe Import System provides a seamless, intelligent way to import recipes from any source with automatic content detection, AI-powered refinement (optional), a full-screen preview-before-save flow with inline editing, and comprehensive validation.

## Key Features

### 🎯 Smart Detection & Parsing
- **Automatic Content Type Detection**: Identifies URLs, text, images, and videos automatically
- **Platform-Specific Recognition**: Optimized handling for TikTok, Instagram, YouTube, recipe websites
- **Multi-Modal Processing**: Combines OCR, transcription, and web scraping for maximum accuracy

### 🤖 AI Gap-Filling
- **Missing Ingredient Recovery**: Finds ingredients mentioned in steps but missing from lists
- **Quantity Inference**: Intelligently estimates missing quantities based on context
- **Unit Standardization**: Converts measurements to consistent units
- **Recipe Enhancement**: Fills in missing prep/cook times, servings, and descriptions

### ✅ Source-Agnostic Reliability
- **Unified Processing Pipeline**: Same interface for all input types
- **Fallback Strategies**: Multiple extraction methods with graceful degradation
- **Quality Metrics**: Confidence scoring for every extraction step

### 🔍 Validation Layer
- **Consistency Checking**: Ensures ingredients and steps align
- **Completeness Validation**: Identifies missing critical information
- **Quality Assessment**: Overall recipe quality scoring
- **User Feedback**: Clear warnings and suggestions for improvements

## Architecture

### Core Components

1. **Enhanced Universal Import (`utils/enhancedUniversalImport.ts`)**
   - Main orchestration layer
   - Processing pipeline management
   - Quality metrics calculation

2. **Input Detection System (`utils/inputDetection.ts`)**
   - Content type identification
   - Platform recognition
   - Validation and hints

3. **Content Processors**
   - **Text Normalizer** (`utils/textContentNormalizer.ts`): Cleans social media content
   - **Video Extractor** (`utils/videoContentExtractor.ts`): Multi-modal video processing
   - **Image OCR** (`utils/imageOcrProcessor.ts`): Enhanced text extraction from images
   - **AI Parser** (`utils/aiRecipeParser.ts`): Structured recipe parsing with validation

4. **Import Modal (`components/ImportRecipeModal.tsx`)**
   - Full-screen preview-before-save UI
   - Inline editing of title, description, ingredients, and steps
   - Optional "Improve with AI" refinement step (deterministic)
   - Quality indicators and validation summaries

### Processing Pipeline

```
Input → Detection → Extraction → AI Enhancement → Validation → Quality Assessment → Final Processing
```

#### Step 1: Input Detection & Validation
- Analyzes input to determine content type
- Validates format and accessibility
- Provides platform-specific hints

#### Step 2: Content Extraction
- **URLs**: Web scraping with structured data extraction
- **Text**: Social media content normalization
- **Images**: OCR with preprocessing and enhancement
- **Videos**: Multi-modal extraction (audio + captions + frame text)

#### Step 3: AI Enhancement
- Recipe reconciliation and gap filling
- Ingredient recovery and quantity inference
- Unit standardization and normalization

#### Step 4: Validation & Consistency
- Cross-reference ingredients with instructions
- Identify missing or inconsistent information
- Generate suggestions for improvements

#### Step 5: Quality Assessment
- Content quality scoring
- Extraction accuracy metrics
- Recipe completeness evaluation
- Overall confidence calculation

#### Step 6: Final Processing
- Recipe normalization and cleanup
- Format standardization
- Metadata enrichment

## Usage

### Basic Import

```typescript
import { enhancedSmartImport } from '@/utils/enhancedUniversalImport';

const result = await enhancedSmartImport({
  url: 'https://example.com/recipe',
  // or text: 'Recipe text content...',
  // or file: { uri: 'file://...', mime: 'image/jpeg' }
});

console.log('Recipe:', result.recipe);
console.log('Quality Score:', result.provenance.qualityMetrics?.overallScore);
console.log('Processing Steps:', result.provenance.processingSteps);
```

### Using the Import Modal

```typescript
import { ImportRecipeModal } from '@/components/ImportRecipeModal';

<ImportRecipeModal
  visible={showModal}
  onClose={() => setShowModal(false)}
  onSave={(recipe) => saveRecipe(recipe)}
/>

// The preview modal supports an "Improve with AI" action that seeds
// the editable fields with refined content. Users can review/edit before saving.
```

## Quality Metrics

The system provides comprehensive quality assessment:

### Content Quality (0-1)
- Input content length and structure
- Presence of key recipe elements
- Text clarity and completeness

### Extraction Accuracy (0-1)
- Success rate of processing steps
- Confidence scores from individual extractors
- Fallback usage indicators

### Recipe Completeness (0-1)
- Required fields presence (title, ingredients, steps)
- Optional metadata availability (times, servings)
- Ingredient quantity completeness

### Consistency Score (0-1)
- Ingredient-instruction alignment
- Unit standardization success
- Cross-reference validation results

### Overall Score (0-1)
Weighted combination of all metrics providing a single quality indicator.

## Validation Results

### Critical Issues
- Missing required fields
- Ingredient-instruction mismatches
- Unusable or corrupted content

### Warnings
- Low confidence extractions
- Missing optional information
- Potential accuracy concerns

### Suggestions
- Recommended improvements
- Alternative processing approaches
- User action recommendations

### Inferred Data
- AI-generated quantities
- Estimated cooking times
- Recovered missing ingredients

## Platform-Specific Optimizations

### TikTok Videos
- Audio transcription with cooking term recognition
- Frame-by-frame text extraction for ingredient lists
- Caption parsing for recipe details

### Instagram Reels/Posts
- Story and post content extraction
- Hashtag and mention filtering
- Image text recognition for recipe cards

### YouTube Videos
- Description parsing for ingredient lists
- Timestamp-based content extraction
- Closed caption utilization

### Recipe Websites
- Structured data extraction (JSON-LD, microdata)
- Content area identification
- Advertisement and navigation filtering

### Images/Screenshots
- OCR preprocessing and enhancement
- Recipe card format recognition
- Handwriting recognition support

## Error Handling & Fallbacks

### Graceful Degradation
1. **Primary Method Fails**: Automatic fallback to alternative extraction
2. **Partial Success**: Continue with available data, mark missing fields
3. **Complete Failure**: Provide clear error messages and suggestions

### Common Fallback Scenarios
- **Video Processing**: Audio-only transcription when frame extraction fails
- **OCR Failure**: Basic image processing when enhanced OCR unavailable
- **AI Enhancement**: Return original extraction if enhancement fails
- **Validation Error**: Skip validation step, provide basic quality metrics

## Performance Considerations

### Processing Time Estimates
- **Text/URL**: 2-5 seconds
- **Images**: 5-15 seconds (depending on OCR complexity)
- **Videos**: 15-60 seconds (depending on length and quality)

### Optimization Strategies
- **Parallel Processing**: Multiple extraction methods run concurrently
- **Caching**: Results cached for repeated imports
- **Progressive Enhancement**: Basic results shown immediately, enhanced over time
- **Resource Management**: Automatic cleanup of temporary files and resources

## Configuration Options

### Import Options
```typescript
interface ImportOptions {
  useMultiStage?: boolean;        // Enable multi-stage AI processing
  includeNutrition?: boolean;     // Attempt nutrition extraction
  strictValidation?: boolean;     // Enforce strict validation rules
  confidenceThreshold?: number;   // Minimum confidence for acceptance
  maxRetries?: number;           // Maximum retry attempts
}
```

### Processing Customization
- **Text Normalization**: Configurable cleaning rules
- **OCR Settings**: Provider selection and preprocessing options
- **Video Extraction**: Frame interval and quality settings
- **AI Enhancement**: Model selection and prompt customization

## Monitoring & Analytics

### Processing Metrics
- Success/failure rates by content type
- Average processing times
- Quality score distributions
- User satisfaction indicators

### Error Tracking
- Failed import categorization
- Common failure patterns
- Performance bottlenecks
- User feedback correlation

## Future Enhancements

### Planned Features
- **Batch Import**: Multiple recipes from single source
- **Recipe Similarity Detection**: Avoid duplicate imports
- **User Learning**: Personalized extraction improvements
- **Community Validation**: Crowdsourced quality improvements

### Integration Opportunities
- **Recipe Databases**: Direct integration with popular recipe sites
- **Social Media APIs**: Official API usage where available
- **Nutrition Services**: Automatic nutrition calculation
- **Translation Services**: Multi-language recipe support

## Troubleshooting

### Common Issues

#### Low Quality Scores
- **Cause**: Poor input quality or complex content
- **Solution**: Try different source or provide additional context

#### Missing Ingredients
- **Cause**: Ingredients mentioned in steps but not in list
- **Solution**: System automatically recovers most cases, manual review for edge cases

#### Incorrect Quantities
- **Cause**: OCR errors or ambiguous text
- **Solution**: AI inference with confidence indicators, user review recommended

#### Processing Timeouts
- **Cause**: Large files or complex content
- **Solution**: Automatic fallback to simpler processing methods

### Debug Information

The system provides detailed processing logs:
- Step-by-step execution times
- Confidence scores for each operation
- Fallback usage indicators
- Error messages and recovery actions

## Best Practices

### For Users
1. **High-Quality Sources**: Use clear, well-formatted recipe content
2. **Complete Information**: Provide URLs when available for best results
3. **Review Results**: Check AI-inferred data before saving
4. **Report Issues**: Feedback helps improve the system

### For Developers
1. **Error Handling**: Always handle import failures gracefully
2. **Progress Feedback**: Show processing progress for long operations
3. **Quality Indicators**: Display confidence scores to users
4. **Validation Results**: Present validation summaries clearly

## API Reference

### Main Functions

#### `enhancedSmartImport(input: SmartInput): Promise<EnhancedSmartOutput>`
Primary import function with full processing pipeline.

#### `smartImport(input: SmartInput): Promise<SmartOutput>`
Backward-compatible wrapper for existing code.

### Types

#### `SmartInput`
```typescript
{
  url?: string;
  text?: string;
  file?: { uri: string; mime?: string; name?: string };
}
```

#### `EnhancedSmartOutput`
```typescript
{
  recipe: Recipe;
  provenance: {
    source: 'url' | 'text' | 'image' | 'video';
    confidence: number;
    qualityMetrics: QualityMetrics;
    processingSteps: ProcessingStep[];
    validationResult: ValidationSummary;
    // ... additional metadata
  };
}
```

This enhanced system transforms recipe import from a manual, error-prone process into an intelligent, reliable, and user-friendly experience that handles any type of recipe content with confidence and accuracy.