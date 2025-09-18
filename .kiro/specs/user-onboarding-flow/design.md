# Design Document

## Overview

The NutriAI onboarding flow is designed as a modern, value-first user experience that introduces new users to the app's capabilities while collecting essential profile information. The design follows 2025 mobile UX best practices by delaying authentication until after users experience value, using engaging micro-interactions, and maintaining accessibility throughout.

The onboarding system integrates seamlessly with NutriAI's existing architecture, including the UserProfile hooks, Supabase backend, and design system. It replaces the current simple authentication flow with a comprehensive 7-screen journey that sets users up for success with personalized nutrition coaching, meal planning, and inventory management.

## Architecture

### Navigation Structure

The onboarding flow uses a stack-based navigation pattern with the following screen hierarchy:

```
OnboardingStack
├── WelcomeScreen (Step 1/7)
├── HealthGoalsScreen (Step 2/7)
├── BasicProfileScreen (Step 3/7)
├── DietaryPreferencesScreen (Step 4/7)
├── PantrySetupScreen (Step 5/7)
├── AICoachIntroScreen (Step 6/7)
└── AuthenticationCompletionScreen (Step 7/7)
```

### Integration Points

The onboarding system integrates with existing NutriAI systems:

- **UserProfile System**: Uses `useUserProfile` hook for data persistence
- **Authentication**: Integrates with existing `useAuth` hook and Supabase auth
- **Design System**: Leverages existing colors, typography, and spacing constants
- **Inventory System**: Connects with `useInventoryStore` for pantry setup
- **Navigation**: Uses Expo Router for screen transitions

### State Management

The onboarding flow uses a dedicated context provider (`OnboardingProvider`) that:
- Manages temporary onboarding data before persistence
- Handles navigation state and progress tracking
- Coordinates with existing app state management
- Provides data validation and error handling

## Components and Interfaces

### Core Components

#### OnboardingProvider
```typescript
interface OnboardingContextType {
  currentStep: number;
  totalSteps: number;
  onboardingData: OnboardingData;
  updateOnboardingData: (section: keyof OnboardingData, data: any) => void;
  nextStep: () => void;
  previousStep: () => void;
  completeOnboarding: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}
```

#### OnboardingData Interface
```typescript
interface OnboardingData {
  healthGoal: HealthGoal | null;
  basicProfile: {
    age?: number;
    height?: number;
    weight?: number;
    activityLevel?: ActivityLevel;
    targetWeight?: number;
    gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  };
  dietaryPreferences: {
    restrictions: DietaryRestriction[];
    allergies: string[];
    customRestrictions: string[];
  };
  pantrySetup: {
    skipPantry: boolean;
    initialItems: InventoryItem[];
  };
  notifications: {
    mealReminders: boolean;
    shoppingAlerts: boolean;
    progressUpdates: boolean;
    expirationAlerts: boolean;
  };
  authChoice: 'signup' | 'signin' | 'guest' | null;
}
```

### Screen Components

#### 1. WelcomeScreen
- **Purpose**: Brand introduction and value proposition
- **Key Elements**: Logo, tagline, three benefit cards, progress indicator
- **Animations**: Staggered fade-in for benefit cards, subtle logo animation
- **Integration**: Sets up onboarding context, tracks analytics

#### 2. HealthGoalsScreen
- **Purpose**: Primary goal selection for personalized recommendations
- **Key Elements**: Goal cards with icons, single selection, progress indicator
- **Animations**: Card selection with scale and color transitions
- **Integration**: Maps to UserProfile goalType field

#### 3. BasicProfileScreen
- **Purpose**: Physical information for calorie and macro calculations
- **Key Elements**: Age slider, height/weight inputs, activity level selector
- **Animations**: Smooth slider interactions, input focus animations
- **Integration**: Populates UserBasics interface, calculates nutrition targets

#### 4. DietaryPreferencesScreen
- **Purpose**: Food restrictions and preferences for recipe filtering
- **Key Elements**: Multi-select diet cards, allergy input, custom restrictions
- **Animations**: Multi-select feedback, tag animations for allergies
- **Integration**: Updates UserPreferencesProfile, affects recipe recommendations

#### 5. PantrySetupScreen
- **Purpose**: Introduction to inventory management with optional setup
- **Key Elements**: Feature explanation, three action options, demo preview
- **Animations**: Demo interaction preview, option selection feedback
- **Integration**: Optional connection to InventoryProvider

#### 6. AICoachIntroScreen
- **Purpose**: AI capabilities demonstration and expectation setting
- **Key Elements**: AI avatar, feature showcase, sample conversation
- **Animations**: Typing animation for sample conversation, avatar micro-interactions
- **Integration**: Prepares user for coach interactions, sets AI context

#### 7. AuthenticationCompletionScreen
- **Purpose**: Account creation, notification permissions, onboarding completion
- **Key Elements**: Auth options, notification toggles, completion celebration
- **Animations**: Celebration confetti, smooth permission toggles
- **Integration**: Connects to useAuth, saves all onboarding data

### Shared Components

#### ProgressIndicator
```typescript
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  animated?: boolean;
}
```

#### OnboardingButton
```typescript
interface OnboardingButtonProps {
  title: string;
  onPress: () => void;
  variant: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}
```

#### OptionCard
```typescript
interface OptionCardProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  multiSelect?: boolean;
}
```

## Data Models

### Health Goals Mapping
```typescript
type HealthGoal = 'lose-weight' | 'gain-weight' | 'maintain-weight' | 'build-muscle' | 'improve-health' | 'manage-restrictions';

const goalToProfileMapping: Record<HealthGoal, UserGoals> = {
  'lose-weight': { goalType: 'lose' },
  'gain-weight': { goalType: 'gain' },
  'maintain-weight': { goalType: 'maintain' },
  'build-muscle': { goalType: 'gain' }, // with higher protein targets
  'improve-health': { goalType: 'maintain' },
  'manage-restrictions': { goalType: 'maintain' }
};
```

### Calorie Calculation Logic
```typescript
interface CalorieCalculationParams {
  age: number;
  height: number; // cm
  weight: number; // kg
  gender: 'male' | 'female' | 'other';
  activityLevel: ActivityLevel;
  goalType: 'lose' | 'gain' | 'maintain';
}

// Uses Mifflin-St Jeor Equation with activity multipliers
function calculateDailyCalories(params: CalorieCalculationParams): number;
function calculateMacroTargets(calories: number, goalType: string): MacroTargets;
```

### Data Persistence Strategy
```typescript
interface OnboardingPersistence {
  // Temporary storage during onboarding
  saveTemporaryData: (data: Partial<OnboardingData>) => Promise<void>;
  loadTemporaryData: () => Promise<OnboardingData | null>;
  
  // Final persistence to user profile
  persistToProfile: (data: OnboardingData, userId?: string) => Promise<void>;
  
  // Guest to authenticated user migration
  migrateGuestData: (userId: string) => Promise<void>;
}
```

## Error Handling

### Validation Strategy
- **Client-side validation**: Immediate feedback for form inputs
- **Progressive validation**: Validate as user progresses through fields
- **Error recovery**: Clear error messages with suggested actions
- **Offline handling**: Cache onboarding data for offline completion

### Error States
```typescript
interface OnboardingError {
  type: 'validation' | 'network' | 'auth' | 'storage';
  message: string;
  field?: string;
  recoverable: boolean;
  retryAction?: () => void;
}
```

### Error Boundaries
- Screen-level error boundaries for graceful degradation
- Fallback UI for critical failures
- Error reporting integration for debugging

## Testing Strategy

### Unit Testing
- Component rendering and prop handling
- Data validation and transformation logic
- Calculation functions (calories, macros)
- State management and context operations

### Integration Testing
- Screen navigation flow
- Data persistence to UserProfile system
- Authentication integration
- Notification permission handling

### E2E Testing
- Complete onboarding flow scenarios
- Guest to authenticated user migration
- Error recovery and retry scenarios
- Accessibility compliance testing

### Test Data
```typescript
const mockOnboardingData: OnboardingData = {
  healthGoal: 'lose-weight',
  basicProfile: {
    age: 30,
    height: 170,
    weight: 75,
    activityLevel: 'moderately-active',
    targetWeight: 70,
    gender: 'female'
  },
  dietaryPreferences: {
    restrictions: ['vegetarian'],
    allergies: ['nuts'],
    customRestrictions: []
  },
  pantrySetup: {
    skipPantry: false,
    initialItems: []
  },
  notifications: {
    mealReminders: true,
    shoppingAlerts: true,
    progressUpdates: false,
    expirationAlerts: true
  },
  authChoice: 'signup'
};
```

## Performance Considerations

### Optimization Strategies
- **Lazy loading**: Load screens as needed to reduce initial bundle size
- **Image optimization**: Use optimized icons and illustrations
- **Animation performance**: Use native driver for smooth animations
- **Memory management**: Clean up resources when screens unmount

### Caching Strategy
- Cache onboarding progress locally
- Preload next screen assets during current screen interaction
- Cache calculated nutrition targets to avoid recalculation

### Bundle Size Management
- Code splitting for onboarding flow
- Shared component extraction
- Asset optimization and compression

## Accessibility Implementation

### Screen Reader Support
- Semantic HTML/React Native elements
- Proper heading hierarchy
- Descriptive labels for all interactive elements
- Progress announcements for screen readers

### Visual Accessibility
- High contrast color combinations
- Scalable text support
- Focus indicators for keyboard navigation
- Alternative text for all images and icons

### Motor Accessibility
- Large touch targets (minimum 44pt)
- Gesture alternatives for complex interactions
- Voice input support where applicable
- Reduced motion respect for animations

### Cognitive Accessibility
- Clear, simple language
- Consistent navigation patterns
- Progress indicators to reduce cognitive load
- Error messages with clear recovery steps

## Security Considerations

### Data Protection
- Encrypt sensitive data in local storage
- Secure transmission of profile data to Supabase
- Proper session management for authenticated users
- GDPR compliance for data collection

### Privacy Implementation
- Clear privacy policy presentation
- Granular consent for data collection
- Option to delete onboarding data
- Anonymous usage analytics with opt-out

### Authentication Security
- Secure password requirements
- OAuth integration security
- Guest account data isolation
- Account migration security

## Analytics and Monitoring

### Onboarding Metrics
- Completion rate by screen
- Drop-off points identification
- Time spent per screen
- Error frequency and types

### User Behavior Tracking
- Goal selection distribution
- Dietary preference patterns
- Pantry setup adoption rate
- Notification permission grant rate

### Performance Monitoring
- Screen load times
- Animation frame rates
- Memory usage patterns
- Crash reporting and recovery

## Future Enhancements

### Personalization Improvements
- Dynamic screen ordering based on user responses
- Smart defaults based on demographic data
- Progressive profiling for advanced features
- Machine learning for recommendation improvements

### Feature Additions
- Social onboarding (invite friends, share goals)
- Integration with health apps and wearables
- Advanced dietary restriction handling
- Multilingual support for global users

### Technical Improvements
- Server-side rendering for faster initial load
- Advanced caching strategies
- Real-time data synchronization
- Enhanced offline capabilities