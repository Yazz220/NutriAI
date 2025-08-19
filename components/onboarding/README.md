# NutriAI Onboarding System

A comprehensive onboarding system for NutriAI that guides new users through setup while demonstrating the app's core value propositions.

## 🚀 Quick Start

```tsx
import { OnboardingWithProvider } from '@/components/onboarding';

// Use in your app routing
export default function OnboardingScreen() {
  return <OnboardingWithProvider />;
}
```

## 📁 Structure

```
components/onboarding/
├── screens/                    # Individual onboarding screens
│   ├── WelcomeScreen.tsx      # Value proposition & hero
│   ├── AuthScreen.tsx         # Authentication options
│   ├── DietaryPreferencesScreen.tsx # Diet & allergy setup
│   ├── CookingHabitsScreen.tsx     # Cooking preferences
│   ├── InventoryKickstartScreen.tsx # Initial inventory
│   ├── AICoachIntroScreen.tsx      # AI demo
│   └── CompletionScreen.tsx        # Final actions
├── components/                 # Shared UI components
│   ├── OnboardingLayout.tsx   # Layout wrapper
│   ├── ProgressIndicator.tsx  # Step progress
│   ├── SkipButton.tsx         # Skip functionality
│   └── MultiSelectChips.tsx   # Multi-selection UI
├── OnboardingProvider.tsx     # State management
├── OnboardingFlow.tsx         # Main flow controller
└── __tests__/                 # Test suites
```

## 🎯 Features

### ✅ Complete Implementation
- **7 Onboarding Screens** - Welcome to completion
- **State Management** - Persistent context with AsyncStorage
- **Analytics Tracking** - Comprehensive event tracking
- **Navigation System** - Smart flow control with validation
- **Accessibility** - Full screen reader and keyboard support
- **Error Handling** - Robust error recovery mechanisms
- **Testing Suite** - Unit and integration tests
- **Type Safety** - Full TypeScript coverage

### 🎨 Design Features
- **Dark Theme** - Consistent with app design
- **Animations** - Smooth transitions and micro-interactions
- **Responsive** - Adapts to all screen sizes
- **Platform Specific** - iOS/Android optimizations

### 🔧 Technical Features
- **Resume Capability** - Continue from interruption
- **Skip Options** - Flexible user flow
- **Data Validation** - Form validation and error handling
- **Performance** - Optimized rendering and memory usage

## 📊 Analytics Events

The system tracks comprehensive analytics:

```typescript
// Automatic events
- onboarding_welcome_shown
- onboarding_dietary_set
- onboarding_habits_set
- onboarding_coach_demo_viewed
- onboarding_completed

// User choice tracking
- Navigation decisions
- Skip vs continue choices
- Time spent per step
- Drop-off points
```

## 🎛️ Configuration

### Onboarding Steps
Configure in `constants/onboarding.ts`:

```typescript
export const ONBOARDING_STEPS = {
  WELCOME: {
    title: 'Welcome to NutriAI',
    subtitle: 'Your AI-powered kitchen companion',
    canSkip: true,
  },
  // ... other steps
};
```

### Starter Items
Customize inventory items:

```typescript
export const STARTER_ITEMS: StarterItem[] = [
  {
    id: 'rice',
    name: 'Rice',
    category: 'Pantry',
    icon: '🍚',
    commonUnit: 'cups',
    defaultQuantity: 2,
    popularity: 95,
  },
  // ... more items
];
```

## 🧪 Testing

Run the test suite:

```bash
# Unit tests
npm test components/onboarding

# Specific test files
npm test OnboardingProvider.test.tsx
npm test WelcomeScreen.test.tsx
```

## 🔗 Integration

### App Routing
```tsx
// app/(onboarding)/_layout.tsx
import { OnboardingProvider } from '@/components/onboarding';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingProvider>
  );
}
```

### Onboarding Check
```tsx
import { useOnboardingCheck } from '@/hooks/useOnboardingCheck';

export default function RootLayout() {
  const { shouldShowOnboarding, redirectToOnboarding } = useOnboardingCheck();
  
  useEffect(() => {
    if (shouldShowOnboarding) {
      redirectToOnboarding();
    }
  }, [shouldShowOnboarding]);
}
```

## 📱 Usage Examples

### Custom Screen
```tsx
import { OnboardingLayout, useOnboarding } from '@/components/onboarding';

export const CustomScreen = () => {
  const { nextStep, skipStep } = useOnboarding();
  
  return (
    <OnboardingLayout
      title="Custom Step"
      subtitle="Your custom onboarding step"
      showSkip={true}
      onSkip={skipStep}
    >
      {/* Your content */}
    </OnboardingLayout>
  );
};
```

### Analytics Tracking
```tsx
import { useOnboardingAnalytics } from '@/hooks/useOnboardingAnalytics';

const { trackUserChoice } = useOnboardingAnalytics();

const handleAction = () => {
  trackUserChoice({
    step: OnboardingStep.WELCOME,
    choiceType: 'custom_action',
    choiceValue: 'button_clicked',
  });
};
```

## 🎨 Customization

### Theming
All colors and spacing use the app's design system:

```typescript
// Colors from @/constants/colors
- Colors.primary: "#FF9500"
- Colors.background: "#000000"
- Colors.card: "#1C1C1E"
- Colors.text: "#FFFFFF"

// Spacing from @/constants/spacing
- Spacing.xs to Spacing.xxxl
- Typography.sizes and weights
```

### Component Variants
```tsx
// Layout variants
<OnboardingWelcomeLayout />      // No progress indicator
<OnboardingCompletionLayout />   // No progress or skip
<OnboardingLayoutWithCustomProgress /> // Custom progress

// Button variants
<SkipButton variant="text" />    // Text-based skip
<SkipButton variant="button" />  // Button-based skip
```

## 🚀 Performance

- **Lazy Loading** - Screens loaded on demand
- **Memoization** - Optimized re-renders
- **Efficient State** - Minimal state updates
- **Memory Management** - Proper cleanup on completion

## 🔒 Privacy & Security

- **Data Minimization** - Only collect necessary data
- **Local Storage** - Sensitive data stored locally
- **Encryption** - All network data encrypted
- **User Control** - Clear privacy options

## 📈 Metrics

Track onboarding success:
- **Completion Rate** - % of users completing onboarding
- **Drop-off Points** - Where users exit the flow
- **Time to Complete** - Average completion time
- **Skip Rates** - Which steps are skipped most
- **First Actions** - What users do after onboarding

## 🤝 Contributing

When adding new screens:

1. Create screen component in `screens/`
2. Add to `screens/index.ts` exports
3. Update `OnboardingFlow.tsx` routing
4. Add analytics tracking
5. Write unit tests
6. Update this README

## 📄 License

Part of the NutriAI application.