# Requirements Document

## Introduction

This feature implements a comprehensive 7-screen onboarding flow for NutriAI that guides new users through setting up their profile, preferences, and understanding the app's core features. The onboarding flow will replace the current simple authentication flow and provide a smooth introduction to the AI-powered nutrition assistant capabilities. The flow will collect essential user data to enable personalized meal planning, nutrition coaching, and inventory management from day one.

## Requirements

### Requirement 1: Welcome and Value Proposition Screen

**User Story:** As a new user, I want to understand what NutriAI offers and how it will help me, so that I feel confident about proceeding with the setup.

#### Acceptance Criteria

1. WHEN the user first opens the app (before authentication) THEN the system SHALL display a welcome screen with NutriAI branding and logo
2. WHEN the welcome screen loads THEN the system SHALL show the tagline "Your AI-Powered Nutrition Assistant"
3. WHEN the welcome screen is displayed THEN the system SHALL present three core benefits: "Track meals effortlessly with AI", "Manage your pantry inventory", and "Get personalized meal suggestions"
4. WHEN the user views the welcome screen THEN the system SHALL display a progress indicator showing step 1 of 7
5. WHEN the user taps "Get Started" THEN the system SHALL navigate to the health goals setup screen

### Requirement 2: Health Goals Setup Screen

**User Story:** As a new user, I want to specify my primary health goal, so that the app can provide personalized recommendations aligned with my objectives.

#### Acceptance Criteria

1. WHEN the health goals screen loads THEN the system SHALL display the title "What's your primary goal?"
2. WHEN the screen is displayed THEN the system SHALL present six goal options: "Lose weight", "Gain weight", "Maintain weight", "Build muscle", "Improve health", and "Manage dietary restrictions"
3. WHEN each goal option is shown THEN the system SHALL display appropriate visual icons for each choice
4. WHEN the user selects a goal THEN the system SHALL highlight the selected option and enable the continue button
5. WHEN the user taps continue THEN the system SHALL save the selected goal to the user profile and navigate to the basic profile information screen
6. WHEN the screen is displayed THEN the system SHALL show a progress indicator at step 2 of 7

### Requirement 3: Basic Profile Information Screen

**User Story:** As a new user, I want to provide my basic physical information, so that the app can calculate accurate nutrition recommendations and calorie targets.

#### Acceptance Criteria

1. WHEN the basic profile screen loads THEN the system SHALL display input fields for age, height, weight, activity level, and target weight (if applicable based on goal)
2. WHEN age input is displayed THEN the system SHALL provide a slider or numeric input with validation for reasonable age ranges (13-120)
3. WHEN height and weight inputs are shown THEN the system SHALL support both metric and imperial units with clear unit labels
4. WHEN activity level selection is presented THEN the system SHALL offer five options: "Sedentary", "Lightly Active", "Moderately Active", "Very Active", and "Extremely Active"
5. WHEN target weight field is shown THEN the system SHALL only display this field IF the user selected "Lose weight" or "Gain weight" in the previous screen
6. WHEN all required fields are completed THEN the system SHALL enable the continue button
7. WHEN the user taps continue THEN the system SHALL save the profile information and navigate to dietary preferences screen
8. WHEN the screen is displayed THEN the system SHALL show a progress indicator at step 3 of 7
9. WHEN the user wants to skip optional fields THEN the system SHALL provide a "Skip for now" option

### Requirement 4: Dietary Preferences and Restrictions Screen

**User Story:** As a new user, I want to specify my dietary preferences and restrictions, so that the app only suggests appropriate recipes and meal plans.

#### Acceptance Criteria

1. WHEN the dietary preferences screen loads THEN the system SHALL display the title "Tell us about your dietary preferences"
2. WHEN the screen is shown THEN the system SHALL present common diet options as multi-select choices: "Standard/No restrictions", "Vegetarian", "Vegan", "Pescatarian", "Keto", "Paleo", "Gluten-free"
3. WHEN diet options are displayed THEN the system SHALL show visual icons for each dietary preference
4. WHEN the user selects dietary preferences THEN the system SHALL allow multiple selections except when "Standard/No restrictions" is selected
5. WHEN "Standard/No restrictions" is selected THEN the system SHALL deselect all other dietary options
6. WHEN the screen is displayed THEN the system SHALL provide a text input field for allergies and food restrictions
7. WHEN the user enters allergies THEN the system SHALL support comma-separated or tag-based input
8. WHEN the user taps continue THEN the system SHALL save dietary preferences and navigate to pantry setup introduction
9. WHEN the screen is displayed THEN the system SHALL show a progress indicator at step 4 of 7

### Requirement 5: Pantry Setup Introduction Screen

**User Story:** As a new user, I want to understand how the digital pantry works and have options for setting it up, so that I can start using inventory-aware meal planning.

#### Acceptance Criteria

1. WHEN the pantry setup screen loads THEN the system SHALL display an explanation of pantry management with the text "Let's set up your digital pantry"
2. WHEN the explanation is shown THEN the system SHALL describe key benefits of pantry tracking for meal planning and shopping
3. WHEN setup options are presented THEN the system SHALL offer three choices: "Start adding pantry items", "Skip for later", and "Watch quick demo"
4. WHEN "Start adding pantry items" is selected THEN the system SHALL navigate to a simplified inventory item addition flow
5. WHEN "Skip for later" is selected THEN the system SHALL proceed to the AI coach introduction screen
6. WHEN "Watch quick demo" is selected THEN the system SHALL show a brief demonstration of barcode scanning or item addition
7. WHEN the screen is displayed THEN the system SHALL show a preview of barcode scanner functionality or sample item interaction
8. WHEN the screen is displayed THEN the system SHALL show a progress indicator at step 5 of 7

### Requirement 6: AI Coach Introduction Screen

**User Story:** As a new user, I want to understand the AI nutrition coach capabilities, so that I know how to interact with the AI features for meal planning and nutrition advice.

#### Acceptance Criteria

1. WHEN the AI coach screen loads THEN the system SHALL present the AI nutrition coach with a friendly mascot or avatar
2. WHEN the coach is introduced THEN the system SHALL explain four key AI features: "Meal planning with your pantry", "Smart recipe suggestions", "Shopping list creation", and "Nutrition advice"
3. WHEN AI features are described THEN the system SHALL show a sample chatbot conversation bubble or interaction prompt
4. WHEN the demonstration is shown THEN the system SHALL include example queries like "Plan my meals for this week" or "What can I make with chicken and rice?"
5. WHEN the user views the introduction THEN the system SHALL provide a clear call-to-action to continue to the final setup step
6. WHEN the user taps continue THEN the system SHALL navigate to the notifications and completion screen
7. WHEN the screen is displayed THEN the system SHALL show a progress indicator at step 6 of 7

### Requirement 7: Authentication and Completion Screen

**User Story:** As a new user who has completed the onboarding setup, I want to create my account and enable helpful notifications, so that I can start using NutriAI with all features properly configured and my data saved.

#### Acceptance Criteria

1. WHEN the final screen loads THEN the system SHALL present authentication options (sign up, sign in, or continue as guest) with clear benefits of creating an account
2. WHEN account creation benefits are shown THEN the system SHALL explain data sync, backup, and cross-device access advantages
3. WHEN the user chooses to create an account THEN the system SHALL integrate with the existing authentication flow while preserving onboarding data
4. WHEN authentication is completed or skipped THEN the system SHALL request notification permissions with clear benefit explanations
5. WHEN notification benefits are shown THEN the system SHALL list specific examples: "Meal reminders", "Shopping suggestions", "Progress updates", and "Expiring ingredient alerts"
6. WHEN permission is requested THEN the system SHALL provide clear opt-in options with explanations of each notification type
7. WHEN the user grants or denies permissions THEN the system SHALL save the notification preferences to user settings
8. WHEN setup is complete THEN the system SHALL display "You're all set!" completion message with celebration animation
9. WHEN the completion message is shown THEN the system SHALL provide a "Start tracking" button to enter the main app
10. WHEN "Start tracking" is tapped THEN the system SHALL navigate to the main tabs interface and mark onboarding as completed
11. WHEN the screen is displayed THEN the system SHALL show a progress indicator at step 7 of 7
12. WHEN onboarding is completed THEN the system SHALL set a flag to prevent showing onboarding again for this user

### Requirement 8: Data Integration and Persistence

**User Story:** As a user completing onboarding, I want my setup information to be properly saved and integrated with the app's existing systems, so that my preferences are immediately available throughout the app.

#### Acceptance Criteria

1. WHEN user data is collected during onboarding THEN the system SHALL integrate with the existing UserProfile hook and Supabase backend
2. WHEN health goals are selected THEN the system SHALL map the selection to the appropriate goalType in the user profile goals
3. WHEN basic profile information is entered THEN the system SHALL save data to the UserBasics interface in the profile system
4. WHEN dietary preferences are selected THEN the system SHALL save preferences to the UserPreferencesProfile interface
5. WHEN onboarding is completed THEN the system SHALL calculate and set appropriate daily calorie and macro targets based on user inputs
6. WHEN pantry items are added during onboarding THEN the system SHALL integrate with the existing InventoryProvider
7. WHEN notification preferences are set THEN the system SHALL store preferences in user settings and configure appropriate notification channels
8. WHEN all data is collected THEN the system SHALL perform a single batch save operation to minimize database calls

### Requirement 9: Guest Experience and Value-First Approach

**User Story:** As a new user, I want to experience the app's value before being required to create an account, so that I can make an informed decision about committing to the platform.

#### Acceptance Criteria

1. WHEN the user starts onboarding THEN the system SHALL allow completion of all setup steps without requiring authentication
2. WHEN onboarding data is collected THEN the system SHALL store information locally until the user chooses to create an account
3. WHEN the user reaches the final screen THEN the system SHALL present account creation as a benefit (data sync, backup) rather than a requirement
4. WHEN the user chooses to continue without an account THEN the system SHALL allow full app functionality with local data storage
5. WHEN the user later decides to create an account THEN the system SHALL migrate locally stored data to the cloud seamlessly
6. WHEN the user uses the app as a guest THEN the system SHALL periodically remind them of account benefits without being intrusive
7. WHEN guest data reaches significant volume THEN the system SHALL suggest account creation to prevent data loss

### Requirement 10: Navigation and Progress Management

**User Story:** As a user going through onboarding, I want to see my progress and have the ability to navigate between screens, so that I feel in control of the setup process.

#### Acceptance Criteria

1. WHEN any onboarding screen is displayed THEN the system SHALL show a progress indicator with current step and total steps (X of 7)
2. WHEN the user is on any screen after the first THEN the system SHALL provide a back button to return to the previous screen
3. WHEN the user navigates backward THEN the system SHALL preserve previously entered data
4. WHEN the user closes the app during onboarding THEN the system SHALL save progress and resume from the last completed screen
5. WHEN the user returns to a partially completed onboarding THEN the system SHALL pre-populate fields with previously entered data
6. WHEN the user completes onboarding THEN the system SHALL set a persistent flag to prevent re-showing the onboarding flow
7. WHEN the onboarding is interrupted THEN the system SHALL provide a way to restart or continue the onboarding from the authentication screen

### Requirement 10: Animation and Visual Feedback

**User Story:** As a user going through onboarding, I want smooth and engaging visual feedback for my interactions, so that the experience feels polished and responsive.

#### Acceptance Criteria

1. WHEN the user taps any button THEN the system SHALL provide immediate visual feedback with a subtle press animation
2. WHEN the user navigates between screens THEN the system SHALL use smooth slide transitions that respect the navigation direction
3. WHEN form validation occurs THEN the system SHALL show gentle shake animations for errors and smooth highlight animations for successful inputs
4. WHEN progress updates THEN the system SHALL animate the progress indicator smoothly to the new position
5. WHEN the user selects options (goals, dietary preferences) THEN the system SHALL provide immediate visual feedback with scale or color transitions
6. WHEN the completion screen is reached THEN the system SHALL display a celebration animation (confetti, checkmark, or similar)
7. WHEN animations are displayed THEN the system SHALL respect user accessibility preferences for reduced motion
8. WHEN loading states occur THEN the system SHALL show appropriate loading animations or skeleton screens
9. WHEN errors occur THEN the system SHALL use gentle, non-intrusive animations to draw attention to error messages

### Requirement 11: Responsive Design and Accessibility

**User Story:** As a user with different device sizes and accessibility needs, I want the onboarding flow to work well on my device and be accessible, so that I can complete setup regardless of my device or abilities.

#### Acceptance Criteria

1. WHEN onboarding screens are displayed THEN the system SHALL use responsive design that works on various mobile screen sizes
2. WHEN interactive elements are shown THEN the system SHALL ensure touch targets are at least 44pt for accessibility
3. WHEN text is displayed THEN the system SHALL use the app's existing typography system and support dynamic text sizing
4. WHEN colors are used THEN the system SHALL maintain sufficient contrast ratios for accessibility compliance
5. WHEN form inputs are presented THEN the system SHALL include proper labels and accessibility hints for screen readers
6. WHEN progress indicators are shown THEN the system SHALL provide accessible announcements of progress changes
7. WHEN animations are used THEN the system SHALL respect user preferences for reduced motion
8. WHEN the onboarding is displayed THEN the system SHALL follow the app's existing design system and color palette