# Requirements Document

## Introduction

The AI Recipe Import Optimization feature enhances NutriAI's existing recipe import functionality to provide a seamless, intelligent, and reliable way for users to import recipes from multiple sources including social media platforms (TikTok, Instagram Reels), web URLs, text, images, and videos. The system uses AI to automatically detect input types, process content through format-specific pipelines, validate and recover missing information, and present users with a structured recipe ready for storage in their personal library.

## Requirements

### Requirement 1: Universal Input Acceptance

**User Story:** As a NutriAI user, I want to import recipes from any source using a single entry point, so that I don't need to learn different import methods for different platforms.

#### Acceptance Criteria

1. WHEN a user accesses the import feature THEN the system SHALL provide a single "Import Recipe" interface
2. WHEN a user provides a URL (TikTok, Instagram, YouTube, Pinterest, blog, etc.) THEN the system SHALL accept and process it
3. WHEN a user pastes text content THEN the system SHALL accept and process it
4. WHEN a user uploads an image file THEN the system SHALL accept and process it
5. WHEN a user uploads a video file THEN the system SHALL accept and process it
6. WHEN a user provides input THEN the system SHALL automatically detect the input type without requiring manual selection

### Requirement 2: Intelligent Input Type Detection

**User Story:** As a NutriAI user, I want the system to automatically determine what type of content I'm importing, so that I can focus on the recipe rather than technical details.

#### Acceptance Criteria

1. WHEN the system receives input THEN it SHALL automatically classify it as URL, text, image, or video
2. WHEN input is a valid URL THEN the system SHALL classify it as "url" type
3. WHEN input is a video file THEN the system SHALL classify it as "video" type
4. WHEN input is an image file THEN the system SHALL classify it as "image" type
5. WHEN input is plain text THEN the system SHALL classify it as "text" type
6. WHEN input type cannot be determined THEN the system SHALL default to text processing with user notification

### Requirement 3: Format-Specific Content Extraction

**User Story:** As a NutriAI user, I want the system to extract recipe information using the most appropriate method for each content type, so that I get accurate and complete recipe data.

#### Acceptance Criteria

1. WHEN processing a URL THEN the system SHALL attempt structured recipe extraction using JSON-LD and OpenGraph metadata
2. WHEN processing a video URL THEN the system SHALL fetch caption text using oEmbed or scraping methods
3. WHEN video caption is unavailable THEN the system SHALL fallback to video processing pipeline
4. WHEN processing text input THEN the system SHALL clean and normalize formatting before AI parsing
5. WHEN processing image input THEN the system SHALL run OCR to extract text content
6. WHEN processing video files THEN the system SHALL extract captions, perform OCR on frames, and transcribe audio
7. WHEN multiple extraction methods are used THEN the system SHALL merge all content into a unified text blob

### Requirement 4: AI-Powered Recipe Parsing

**User Story:** As a NutriAI user, I want the AI to convert extracted content into a structured recipe format, so that I have consistent, organized recipe data.

#### Acceptance Criteria

1. WHEN the system has extracted content THEN it SHALL pass the content to an AI recipe parser
2. WHEN AI processes the content THEN it SHALL extract recipe title, ingredients list, cooking steps, preparation time, and servings
3. WHEN AI cannot extract certain fields THEN it SHALL mark them as missing or uncertain
4. WHEN AI parsing is complete THEN the system SHALL return a structured recipe object
5. WHEN AI parsing fails THEN the system SHALL provide fallback parsing with user notification

### Requirement 5: Ingredient Recovery and Validation

**User Story:** As a NutriAI user, I want the system to ensure all recipe ingredients are properly identified and quantified, so that I can cook the recipe successfully.

#### Acceptance Criteria

1. WHEN initial parsing is complete THEN the system SHALL perform a second AI validation pass
2. WHEN ingredients are mentioned in steps but missing from ingredients list THEN the system SHALL add them to the ingredients list
3. WHEN ingredient quantities are missing THEN the system SHALL attempt to infer them from context
4. WHEN quantities cannot be determined THEN the system SHALL mark them with uncertainty indicators (~)
5. WHEN ingredients have low confidence scores THEN the system SHALL flag them for user review
6. WHEN validation is complete THEN all recipe steps SHALL reference valid ingredients from the ingredients list

### Requirement 6: User Review and Correction Interface

**User Story:** As a NutriAI user, I want to review and correct imported recipe data before saving, so that I can ensure accuracy and completeness.

#### Acceptance Criteria

1. WHEN recipe parsing is complete THEN the system SHALL display a preview screen with recipe title, image, ingredients, and steps
2. WHEN uncertain or missing data exists THEN the system SHALL highlight these items in the review interface
3. WHEN user wants to make corrections THEN the system SHALL provide a review panel with quick-fix options
4. WHEN user needs to set missing quantities THEN the system SHALL provide input fields for quantity and unit
5. WHEN user wants to mark ingredients as optional THEN the system SHALL provide toggle options
6. WHEN user wants to remove unwanted entries THEN the system SHALL provide delete options
7. WHEN original source is available THEN the system SHALL provide "Open Original" link for reference

### Requirement 7: Structured Data Storage

**User Story:** As a NutriAI user, I want imported recipes to be saved in a consistent format with proper attribution, so that I can organize and search my recipe library effectively.

#### Acceptance Criteria

1. WHEN user approves the recipe THEN the system SHALL save it to Supabase with complete metadata
2. WHEN saving recipes THEN the system SHALL include source type (url, text, image, video)
3. WHEN recipe has video source THEN the system SHALL store the video URL
4. WHEN recipe has attribution information THEN the system SHALL store platform and creator details
5. WHEN recipe is saved THEN it SHALL be indexed for search, filtering, and categorization
6. WHEN recipe is saved THEN it SHALL be available for nutrition analysis and meal planning

### Requirement 8: Error Handling and Fallback Mechanisms

**User Story:** As a NutriAI user, I want the import process to work reliably even when some extraction methods fail, so that I can still get a usable recipe.

#### Acceptance Criteria

1. WHEN structured extraction fails THEN the system SHALL fallback to AI text parsing
2. WHEN video caption extraction fails THEN the system SHALL attempt OCR and audio transcription
3. WHEN OCR fails THEN the system SHALL notify user and allow manual text input
4. WHEN AI parsing fails THEN the system SHALL provide manual recipe entry option
5. WHEN network requests fail THEN the system SHALL retry with exponential backoff
6. WHEN all extraction methods fail THEN the system SHALL provide clear error messages and alternative options

### Requirement 9: Performance and User Experience

**User Story:** As a NutriAI user, I want the import process to be fast and provide clear feedback, so that I know what's happening and can use the app efficiently.

#### Acceptance Criteria

1. WHEN import process starts THEN the system SHALL display progress indicators
2. WHEN processing takes longer than 5 seconds THEN the system SHALL show detailed status updates
3. WHEN extraction is complete THEN the system SHALL transition to review screen within 2 seconds
4. WHEN user makes corrections THEN the system SHALL update the preview in real-time
5. WHEN save operation completes THEN the system SHALL provide success confirmation and navigate to recipe view

### Requirement 10: Integration with Existing App Features

**User Story:** As a NutriAI user, I want imported recipes to work seamlessly with all existing app features, so that I can use them for meal planning and inventory management.

#### Acceptance Criteria

1. WHEN recipe is saved THEN it SHALL be available in the meals store for availability checking
2. WHEN recipe is saved THEN it SHALL be compatible with the coach suggestion system
3. WHEN recipe is saved THEN it SHALL work with meal planning and shopping list features
4. WHEN recipe is saved THEN it SHALL be available for nutrition analysis
5. WHEN recipe is saved THEN it SHALL support ingredient substitution recommendations based on user inventory