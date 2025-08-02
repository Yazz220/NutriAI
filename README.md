# NutriAI

NutriAI is a mobile application designed to help you effortlessly track your food inventory. Using modern technology, it aims to simplify grocery management by allowing you to add items through barcode scanning, photo capture, and voice notes.

## ✨ Features

- **Inventory Tracking**: View your food items, automatically categorized by freshness (Fresh, Expiring Soon, Expired).
- **Manual Entry**: Add items to your inventory with a traditional form.
- **Quick Add Tools**:
  - **Barcode Scanner**: Scan a product's barcode to instantly add it to your list.
  - **Camera Capture**: Take a photo of your groceries. (Future integration with an AI model will automatically identify and list the items).
  - **Voice Recording**: Record a voice note of your items. (Future integration with an AI model will transcribe and list the items).

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

1. Start the Metro bundler. You can choose the connection method that works best for your network (Tunnel, LAN, or Local).
       npx expo start --tunnel
   ```sh
   npx expo start
   ```
   Or to connect via a tunnel (often more reliable on restricted networks):
   ```sh
   npx expo start --tunnel
   ```
2. Scan the QR code with the Expo Go app on your mobile device.

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query/latest)
- **UI/Icons**: [Lucide React Native](https://lucide.dev/)
- **Languages**: [TypeScript](https://www.typescriptlang.org/)
