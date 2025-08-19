# Design Document

## Overview

The NutriAI onboarding system is designed as a progressive, user-friendly flow that introduces new users to the app's core capabilities while collecting essential personalization data. The design follows the existing dark theme aesthetic with vibrant orange accents, maintaining consistency with the current UI patterns while creating an engaging first-time user experience.

The onboarding system consists of 6 main screens plus conditional flows, designed to be completed in 2-3 minutes while providing immediate value demonstration. Each screen builds upon the previous, creating a cohesive narrative that transforms users from curious newcomers to engaged participants.

## Architecture

### Component Structure

```
OnboardingFlow/
├── OnboardingProvider.tsx          # Context for onboarding state
├── screens/
│   ├── WelcomeScreen.tsx           # Step 0: Value proposition
│   ├── AuthScreen.tsx              # Step 1: Authentication
│   ├── DietaryPreferencesScreen.tsx # Step 2: Dietary setup
│   ├── CookingHabitsScreen.tsx     # Step 3: Habits assessment
│   ├── InventoryKickstartScreen.tsx # Step 4: Initial inventory
│   ├── AICoachIntroScreen.tsx      # Step 5: AI demo
│   └── CompletionScreen.tsx        # Step 6: Final actions
├── components/
│   ├── OnboardingLayout.tsx        # Shared layout wrapper
│   ├── ProgressIndicator.tsx       # Step progress bar
│   ├── SkipButton.tsx              # Consistent skip functionality
│   ├── MultiSelectChips.tsx        # Dietary preferences UI
│   ├── QuickPickGrid.tsx           # Inventory starter items
│   └── AIDemo.tsx                  # Interactive AI demonstration
└── hooks/
    ├── useOnboardingProgress.tsx   # Progress tracking
    ├── useOnboardingAnalytics.tsx  # Event tracking
    └── useOnboardingNavigation.tsx # Flow control
```

### Navigation Flow

The onboarding uses a custom stack navigator that allows:
- Forward progression through steps
- Skip functionality with appropriate warnings
- Resume capability from interrupted sessions
- Conditional routing based on user choices

### State Management

Onboarding state is managed through a dedicated context provider that:
- Tracks current step and completion status
- Stores user selections across screens
- Manages skip states and conditional flows
- Handles persistence for resume functionality

## Components and Interfaces

### OnboardingProvider

```typescript
interface OnboardingState {
  currentStep: number;
  completedSteps: Set<number>;
  userData: {
    authMethod?: 'email' | 'google' | 'apple' | 'guest';
    dietaryPreferences?: string[];
    allergies?: string[];
    goals?: string[];
    cookingSkill?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    cookingTime?: '15min' | '30min' | '45min+';
    shoppingFrequency?: 'daily' | 'weekly' | 'biweekly';
    initialInventory?: string[];
  };
  skippedSteps: Set<number>;
  startTime: Date;
  analytics: OnboardingAnalytics;
}

interface OnboardingContextType {
  state: OnboardingState;
  updateUserData: (data: Partial<OnboardingState['userData']>) => void;
  nextStep: () => void;
  skipStep: () => void;
  goToStep: (step: number) => void;
  completeOnboarding: () => void;
}
```

### Screen Components

#### WelcomeScreen
- Hero section with app logo placeholder and tagline
- Three benefit cards with icons and descriptions
- Primary CTA button with subtle animation
- Skip option with clear consequences messaging
- Background gradient matching auth screens

#### AuthScreen
- Consistent with existing auth design patterns
- Social login options (Google, Apple) with proper branding
- Email/password option with validation
- Guest mode with clear limitations explanation
- Privacy policy link and trust indicators

#### DietaryPreferencesScreen
- Multi-select chip interface for dietary types
- Expandable allergy section with search functionality
- Goal selection with visual icons
- Progress indicator showing completion percentage
- Smart defaults based on common preferences

#### CookingHabitsScreen
- Skill level selector with descriptive labels
- Time preference slider with visual indicators
- Shopping frequency cards with icons
- Contextual help tooltips for unclear options

#### InventoryKickstartScreen
- Two-tab interface: "Scan Items" and "Quick Pick"
- Barcode scanner integration with item recognition
- Categorized quick-pick grid with common staples
- Visual feedback for selected items
- Counter showing items added

#### AICoachIntroScreen
- Interactive demo with real AI responses
- Example prompt chips for quick testing
- Typing animation to show AI "thinking"
- Clear explanation of AI capabilities
- Smooth transition to main app

#### CompletionScreen
- Celebration animation with success messaging
- Three suggested first actions with clear CTAs
- Auto-navigation timer with option to stay
- Setup summary with edit options

### Shared Components

#### OnboardingLayout
```typescript
interface OnboardingLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showProgress?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
  skipWarning?: string;
}
```

Features:
- Consistent header with title and subtitle
- Progress indicator integration
- Skip button with confirmation modal
- Safe area handling for all devices
- Keyboard avoidance for input screens

#### ProgressIndicator
- Horizontal progress bar with step indicators
- Current step highlighting with orange accent
- Completed steps with checkmark icons
- Smooth animations between steps
- Accessible progress announcements

#### MultiSelectChips
```typescript
interface MultiSelectChipsProps {
  options: ChipOption[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  maxSelections?: number;
  searchable?: boolean;
}
```

Features:
- Touch-friendly chip design with haptic feedback
- Search functionality for large option sets
- Visual selection states with animations
- Accessibility support with proper labels

## Data Models

### OnboardingAnalytics
```typescript
interface OnboardingAnalytics {
  sessionId: string;
  startTime: Date;
  events: AnalyticsEvent[];
  completionRate: number;
  dropOffPoint?: number;
  timeSpentPerStep: Record<number, number>;
}

interface AnalyticsEvent {
  type: 'step_viewed' | 'step_completed' | 'step_skipped' | 'option_selected' | 'error_occurred';
  step: number;
  timestamp: Date;
  data?: Record<string, any>;
}
```

### UserPreferences (Extended)
```typescript
interface OnboardingUserPreferences extends UserPreferences {
  onboardingCompleted: boolean;
  onboardingVersion: string;
  completedAt?: Date;
  skippedSteps: number[];
  initialSetupSource: 'onboarding' | 'manual' | 'import';
}
```

### InventoryStarterItems
```typescript
interface StarterItem {
  id: string;
  name: string;
  category: ItemCategory;
  icon: string;
  commonUnit: string;
  defaultQuantity: number;
  popularity: number; // For sorting
}
```

## Error Handling

### Network Connectivity
- Offline detection with appropriate messaging
- Data persistence for offline completion
- Sync on reconnection with conflict resolution
- Graceful degradation for optional features

### Authentication Errors
- Clear error messaging for failed auth attempts
- Retry mechanisms with exponential backoff
- Fallback to guest mode with explanation
- Social login error handling with provider-specific messages

### Input Validation
- Real-time validation with helpful error messages
- Prevention of invalid state progression
- Clear indication of required vs optional fields
- Accessibility-compliant error announcements

### Recovery Mechanisms
- Automatic save of progress at each step
- Resume capability from any interruption point
- Data recovery from partial completions
- Graceful handling of corrupted state

## Testing Strategy

### Unit Testing
- Component rendering and prop handling
- State management logic and transitions
- Analytics event firing and data accuracy
- Input validation and error handling
- Navigation flow correctness

### Integration Testing
- End-to-end onboarding flow completion
- Authentication integration with Supabase
- Data persistence and retrieval
- Analytics integration and event tracking
- Cross-platform compatibility (iOS/Android)

### User Experience Testing
- Accessibility compliance (screen readers, keyboard navigation)
- Performance on low-end devices
- Network interruption handling
- Different screen sizes and orientations
- Internationalization support

### A/B Testing Framework
- Step order optimization
- Copy and messaging effectiveness
- Skip rate analysis by step
- Conversion rate optimization
- Time-to-completion analysis

## Visual Design System

### Color Palette
- Primary: `#FF9500` (Orange accent for CTAs and progress)
- Background: `#000000` (True black for main background)
- Card: `#1C1C1E` (Dark gray for content cards)
- Text: `#FFFFFF` (White for primary text)
- Light Text: `#8A8A8E` (Gray for secondary text)
- Success: `#28A745` (Green for completed states)

### Typography Hierarchy
- Display: 28px, Bold - Screen titles
- H2: 20px, Semibold - Section headers
- H3: 18px, Semibold - Card titles
- Body: 14px, Regular - Main content
- Caption: 12px, Medium - Helper text

### Spacing System
- xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 20px, xxl: 24px, xxxl: 32px
- Consistent application across all onboarding screens
- Responsive scaling for different screen sizes

### Animation Guidelines
- Subtle spring animations for button interactions
- Smooth transitions between steps (300ms ease-out)
- Progress indicator animations with 200ms delay
- Loading states with skeleton screens
- Celebration animations for completion

### Accessibility Considerations
- Minimum 44pt touch targets for all interactive elements
- 4.5:1 contrast ratio for all text
- Screen reader support with proper semantic markup
- Keyboard navigation support for external keyboards
- Reduced motion support for users with vestibular disorders

## Platform-Specific Considerations

### iOS
- Native haptic feedback for selections
- iOS-style navigation gestures
- Integration with iOS accessibility features
- Proper safe area handling for notched devices
- iOS-specific social login flows

### Android
- Material Design motion principles
- Android accessibility services integration
- Proper back button handling
- Android-specific social login flows
- Support for various screen densities

### Performance Optimization
- Lazy loading of non-critical components
- Image optimization and caching
- Minimal bundle size impact
- Efficient re-renders with proper memoization
- Background processing for analytics

## Security and Privacy

### Data Collection
- Minimal data collection with clear purpose explanation
- Opt-in for non-essential data sharing
- Local storage for sensitive preferences
- Encrypted transmission of all user data

### Authentication Security
- Secure token handling and storage
- Proper session management
- Social login security best practices
- Guest mode data isolation

### Analytics Privacy
- Anonymized user identifiers
- GDPR compliance for EU users
- Clear data retention policies
- User control over analytics participation