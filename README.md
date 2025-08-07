# NutriAI

NutriAI is a comprehensive mobile application designed to revolutionize your kitchen management experience. From intelligent inventory tracking to smart meal planning and automated shopping lists, NutriAI helps you reduce food waste, save money, and streamline your cooking routine.

## ✨ Features

### 🏠 **Inventory Management**
- **Smart Categorization**: Automatically organize items by category and freshness status
- **Expiration Tracking**: Visual indicators for items expiring soon with dedicated "Expiring Soon" section
- **Multiple Input Methods**:
  - Manual entry with comprehensive item details
  - Barcode scanning for instant product identification
  - Camera capture for visual item logging
  - Voice notes for hands-free inventory updates
- **Search & Filter**: Quickly find items with real-time search functionality

### 📅 **Meal Planning**
- **Weekly Calendar View**: Visual meal planning with intuitive calendar interface
- **Recipe Integration**: Browse and select from curated recipe collection
- **Smart Recommendations**: Recipe suggestions based on available inventory
- **Meal Type Organization**: Plan breakfast, lunch, dinner, and snacks
- **Nutrition Overview**: Track nutritional information across your meal plans

### 🍳 **Recipe Management**
- **Recipe Explorer**: Comprehensive recipe browser with search and filtering
- **Availability Indicators**: See which recipes you can make with current inventory
- **Detailed Recipe Views**: Complete ingredient lists, instructions, and nutritional info
- **Smart Filtering**: Filter by "Can Make Now", "Missing Few Items", or view all recipes

### 🛒 **Smart Shopping Lists**
- **Auto-Generation**: Automatically create shopping lists from meal plans
- **Inventory Integration**: Only add items you don't already have
- **Category Organization**: Items grouped by store categories for efficient shopping
- **Purchase Tracking**: Mark items as purchased and automatically add to inventory
- **Smart List Generation**: AI-powered suggestions based on consumption patterns

### 🎯 **Additional Features**
- **Cross-Platform Sync**: Data persistence across app sessions
- **Intuitive UI**: Clean, modern interface optimized for mobile use
- **Real-time Updates**: Instant synchronization across all app features
- **Accessibility**: Designed with accessibility best practices

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (LTS version recommended)
- [Expo Go](https://expo.dev/go) app on your iOS or Android device.

### Installation

1. Clone the repository to your local machine:
   ```sh
   git clone <YOUR_REPOSITORY_URL>
   ```
2. Navigate into the project directory:
   ```sh
   cd NutriAI
   ```
3. Install the required NPM packages. If you encounter peer dependency issues, you may need to use the `--legacy-peer-deps` flag.
   ```sh
   npm install --legacy-peer-deps
   ```

## 🏃‍♀️ Usage

1. Start the development server:
   ```sh
   npx expo start
   ```
   Or to connect via a tunnel (often more reliable on restricted networks):
   ```sh
   npx expo start --tunnel
   ```

2. Scan the QR code with the Expo Go app on your mobile device.

3. **Getting Started with NutriAI**:
   - **Add Inventory**: Start by adding items to your inventory using manual entry, barcode scanning, or camera capture
   - **Plan Meals**: Navigate to the Meal Planner tab to schedule your weekly meals
   - **Explore Recipes**: Browse recipes and see which ones you can make with your current inventory
   - **Generate Shopping Lists**: Let NutriAI create smart shopping lists based on your meal plans

## 🎯 Key Workflows

### Adding Inventory Items
1. Tap the "+" button in the Inventory tab
2. Choose your preferred input method (manual, barcode, camera, or voice)
3. Fill in item details including expiration date and category
4. Items automatically appear in your organized inventory

### Planning Meals
1. Navigate to the Meal Planner tab
2. Tap on any day in the weekly calendar
3. Select a meal type (breakfast, lunch, dinner, snack)
4. Choose from available recipes or search for new ones
5. Your meal plan updates automatically

### Smart Shopping
1. Plan your meals for the week
2. Tap "Generate Smart List" in the Shopping List tab
3. Review the automatically generated list of needed ingredients
4. Check off items as you shop - they'll automatically be added to your inventory

## 📱 App Structure

NutriAI features a clean tab-based navigation with four main sections:

1. **Inventory** - Track and manage your food items
2. **Meal Planner** - Plan your weekly meals with calendar view
3. **Recipes** - Explore and discover new recipes
4. **Shopping List** - Manage your grocery shopping efficiently

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) with file-based routing
- **State Management**: Custom hooks with [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) for persistence
- **UI Components**: Custom component library with consistent design system
- **Icons**: [Lucide React Native](https://lucide.dev/) for beautiful, consistent iconography
- **Camera/Audio**: [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/) and [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/)
- **Languages**: [TypeScript](https://www.typescriptlang.org/) for type safety and better developer experience

## 🏗️ Project Structure

```
NutriAI/
├── app/                          # Expo Router app directory
│   ├── (tabs)/                   # Tab-based navigation
│   │   ├── index.tsx            # Inventory screen
│   │   ├── planner.tsx          # Meal planner screen
│   │   ├── recipes.tsx          # Recipes screen
│   │   └── list.tsx             # Shopping list screen
│   └── _layout.tsx              # Root layout
├── components/                   # Reusable components
│   ├── ui/                      # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── ...
│   ├── MealPlannerCalendar.tsx  # Meal planning calendar
│   ├── RecipeExplorer.tsx       # Recipe browsing
│   ├── InventoryItemCard.tsx    # Inventory item display
│   └── ...
├── hooks/                       # Custom React hooks
│   ├── useInventoryStore.ts     # Inventory management
│   ├── useMealPlanner.ts        # Meal planning logic
│   ├── useMealsStore.ts         # Recipe/meal data
│   └── useShoppingListStore.ts  # Shopping list management
├── utils/                       # Utility functions
│   ├── recipeAvailability.ts    # Recipe availability calculations
│   └── validation.ts            # Form validation helpers
├── constants/                   # App constants
│   ├── colors.ts               # Color palette
│   └── spacing.ts              # Spacing and typography
├── types/                      # TypeScript type definitions
└── data/                       # Mock data and constants
```

## 🔧 Development

### Code Organization

The project follows a clean architecture pattern with clear separation of concerns:

- **Components**: Reusable UI components with consistent styling
- **Hooks**: Custom hooks for state management and business logic
- **Utils**: Pure functions for calculations and data transformations
- **Types**: Comprehensive TypeScript definitions for type safety

### Key Design Principles

- **Mobile-First**: Optimized for touch interactions and mobile screen sizes
- **Accessibility**: Built with accessibility best practices
- **Performance**: Efficient rendering and state management
- **User Experience**: Intuitive navigation and clear visual feedback

## 🚀 Future Enhancements

- **AI Integration**: Automatic food recognition from photos
- **Voice Processing**: Speech-to-text for voice notes
- **Nutritional Analysis**: Detailed nutritional tracking and recommendations
- **Social Features**: Share recipes and meal plans with friends
- **Grocery Store Integration**: Real-time pricing and availability
- **Waste Tracking**: Analytics on food waste reduction

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/) for rapid cross-platform development
- Icons provided by [Lucide](https://lucide.dev/)
- Inspired by the need to reduce food waste and improve kitchen efficiency