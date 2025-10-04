![Umma NA Logo](assets/ummana.png)
# UMMA-NA Mobile

A React Native application built with Expo that supports the UMMA-NA emergency maternal transport network. The app equips **Community Health Influencers, Promoters and Services (CHIPS) agents** to request emergency rides and track their status while providing **Emergency Transport System (ETS) drivers** with tools to manage availability and real-time location updates.

## Platform Support

**Currently Tested**: Android only

**iOS Support**: The app is configured for iOS builds but has not been tested on iOS devices or simulators. iOS builds may require additional configuration, particularly for location permissions. If you attempt to build for iOS, you may need to add the following to `app.json` under `ios.infoPlist`:

```json
"NSLocationWhenInUseUsageDescription": "UMMA-NA needs your location to show your position to patients requesting rides.",
"NSLocationAlwaysUsageDescription": "UMMA-NA tracks your location in the background when you're available to respond to emergency requests.",
"NSLocationAlwaysAndWhenInUseUsageDescription": "UMMA-NA needs background location access to help patients find available drivers nearby."
```

## Features

### Shared
- Unified navigation stack that routes users through splash, role selection, authentication, and in-app experiences
- Persistent login state with secure token storage using AsyncStorage
- Global push notification handling configured with expo-notifications
- Real-time communication with the UMMA-NA backend API

### CHIPS Agents
- Home dashboard with quick access to request transport, monitor active rides, view ride history, and manage settings
- Emergency transport request workflow that collects symptoms and pickup coordinates
- Real-time ride status tracking from request to hospital arrival
- Complete ride history with detailed trip information

### ETS Drivers
- Availability toggle with integrated background and foreground location tracking
- Active ride dashboard with turn-by-turn navigation assistance
- Pending ride request notifications with accept/decline functionality
- Automatic permission checks for location and notifications
- Trip history with patient pickup and hospital delivery details

## Important: Development Build Required

**This app cannot run in Expo Go.** Due to the use of custom native modules (background location tracking, task managers, and notification configurations), you must create a development build using EAS Build.

To run this app, you need either:
- A custom development build installed on a physical Android device
- An Android emulator with a development build
- (Untested) An iOS device or simulator with a development build (macOS only)

See the [Building the App](#building-the-app) section for instructions.

## Prerequisites

- **Node.js**: Version 18 LTS or newer (required for Expo SDK 53)
- **npm** or **Yarn**: Package manager (npm comes with Node.js)
- **Expo Account**: Free account at [expo.dev](https://expo.dev) (required for EAS Build)
- **EAS CLI**: Install globally with `npm install -g eas-cli`
- **For Android Development**:
  - Android Studio with an emulator, or physical Android device
- **For iOS Development** (untested):
  - macOS with Xcode
  - iOS simulator or physical iOS device

## Tech Stack

- **Framework**: React Native with Expo SDK 53
- **Navigation**: React Navigation (Stack & Bottom Tabs)
- **State Management**: React Context API
- **Storage**: AsyncStorage for persistent auth tokens
- **Notifications**: Expo Notifications with custom channels
- **Location**: Expo Location with background tracking via Task Manager
- **Maps**: React Native Maps for navigation
- **API Communication**: Axios for HTTP requests

## Getting Started

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Timamamu/umma-na-mobile.git
   cd umma-na-mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Log in to Expo**
   ```bash
   eas login
   ```
   Enter your Expo account credentials.

### Configuration

#### API Endpoint

The backend API URL is configured in `src/constants/index.ts`:

```typescript
export const API_URL = "https://umma-na-backend.onrender.com";
```

To point to a local development backend, change this to:
```typescript
export const API_URL = "http://10.0.2.2:3001"; // For Android emulator
// or
export const API_URL = "http://localhost:3001"; // For iOS simulator (untested)
```

**Note**: There is no `.env` file configuration - the API URL is hardcoded in the constants file.

#### Backend Integration

This mobile app connects to the UMMA-NA Backend API for all data operations.

- **Backend Repository**: [github.com/Timamamu/umma-na-backend](https://github.com/Timamamu/umma-na-backend)
- **Production API**: https://umma-na-backend.onrender.com

Ensure the backend is running and accessible before using the mobile app.

### Building the App

Since this app requires native modules, you must create a development build:

#### For Android (Tested)

```bash
eas build --profile development --platform android
```

After the build completes:
1. Download the APK to your computer
2. Install it on your Android device or emulator
3. Start the development server: `npm start`
4. The app will connect to your development server automatically

#### For iOS (Untested - May Require Additional Configuration)

```bash
eas build --profile development --platform ios
```

**Note**: iOS builds have not been tested. You may encounter issues related to location permissions or other iOS-specific configurations. If you attempt an iOS build, please update the documentation with your findings.

After a successful build:
1. Download and install on your device or simulator
2. Start the development server: `npm start`
3. The app should connect automatically

### Running the Development Server

Once you have a development build installed:

```bash
npm start
```

This starts the Metro bundler. The app on your device will automatically connect and reload when you make code changes.

**Additional commands:**
```bash
npm run android    # Start and open Android
npm run ios        # Start and open iOS (untested)
```

## Push Notifications

### How It Works

The app uses **Expo Push Notifications**, which provides a unified interface for both iOS (APNs) and Android (FCM):

1. **Mobile App**: Generates an Expo Push Token using `getExpoPushTokenAsync()`
2. **Token Storage**: Stores the token in the driver/agent Firestore document as `pushToken`
3. **Backend**: Retrieves the token and sends notifications via Firebase Admin SDK
4. **Delivery**: Firebase Admin SDK automatically routes Expo tokens through Expo's service, which then delivers to APNs/FCM

**No additional Firebase configuration is needed** - the backend handles FCM integration, and Expo manages the token translation automatically.

### Notification Types

- **Ride Requests**: High-priority alerts for new emergency transport requests
- **Ride Updates**: Status changes (accepted, en route, arrived, completed)
- **Location Requests**: Silent background notifications to refresh driver location
- **Emergency Alerts**: Critical notifications with custom sound and vibration

### Permissions

The app requests notification permissions on first launch. Users can manage permissions later in device settings.

## Background Services & Permissions

### Location Tracking (Drivers Only)

- **Foreground**: High-accuracy location updates while the app is open
- **Background**: Continuous location tracking when driver marks themselves available
- **Android Permissions Required**:
  - `ACCESS_FINE_LOCATION`
  - `ACCESS_BACKGROUND_LOCATION`
- **iOS Permissions** (untested):
  - Location "Always" permission

Location freshness expires after 15 minutes to balance accuracy with battery life.

### Notification Permissions

Required for receiving ride requests and updates. The app automatically requests these on first launch.

### Storage

Authentication tokens and user profiles are stored in AsyncStorage. Users remain logged in between sessions until they explicitly log out.

## Project Structure

```
umma-na-mobile/
├── src/
│   ├── components/          # Reusable UI components
│   ├── constants/           # Theme colors, API URL, static config
│   │   ├── colors.ts
│   │   ├── EMERGENCY_CONDITIONS.ts
│   │   ├── fonts.ts
│   │   ├── index.ts        # API_URL configuration
│   │   └── SYMPTOMS.ts
│   ├── contexts/            # React Context providers
│   │   └── AuthContext.tsx
│   ├── navigation/          # Navigation stack definitions
│   │   ├── AppNavigator.tsx
│   │   └── RootNavigation.ts
│   ├── screens/             # Screen components
│   │   ├── chips/          # CHIPS agent screens
│   │   ├── driver/         # ETS driver screens
│   │   ├── LoginScreen.tsx
│   │   ├── RoleSelectScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── SplashScreen.tsx
│   ├── services/            # API, notification, storage, location
│   │   ├── api.ts
│   │   ├── LocationService.ts
│   │   ├── NotificationService.ts
│   │   └── StorageService.ts
│   ├── utils/               # Utility helpers
│   └── types.d.ts           # TypeScript type definitions
├── assets/                  # Fonts, images, splash screens
├── App.tsx                  # Application entry point
├── app.json                 # Expo configuration
├── eas.json                 # EAS Build configuration
├── package.json             # Dependencies and scripts
└── tsconfig.json            # TypeScript configuration
```

## Troubleshooting

### Metro Bundler Issues

Delete the Expo cache if bundling hangs or updates fail:
```bash
rm -rf .expo
npm start -- --clear
```

### Login/Auth Issues

Clear AsyncStorage to reset authentication state:
- Uninstall and reinstall the app, OR
- Add a "Clear Storage" button in development builds

### Location Tracking Not Working (Android)

1. Verify location permissions are granted (Settings > App > Permissions)
2. Check that the driver has marked themselves as available
3. Review device logs for permission errors: `npx react-native log-android`

### Push Notifications Not Received

1. Ensure notification permissions are granted
2. Verify the device push token is stored in Firestore (check backend logs)
3. Test with Expo's push notification tool: https://expo.dev/notifications

### API Connection Errors

1. Verify `API_URL` in `src/constants/index.ts` matches your backend
2. Ensure the backend is running and reachable
3. For local development with Android emulator, use `http://10.0.2.2:3001`
4. Check device network connectivity

## Production Builds

### Creating Production Builds

For Android (tested):
```bash
eas build --platform android --profile production
```

For iOS (untested):
```bash
eas build --platform ios --profile production
```

### App Store Submission

After creating production builds:

**Google Play Store (Android):**
```bash
eas submit --platform android
```

**Apple App Store (iOS - untested):**
```bash
eas submit --platform ios
```

Follow the prompts to provide store credentials and metadata. See [EAS Submit documentation](https://docs.expo.dev/submit/introduction/) for detailed instructions.

## Development Workflow

1. Make code changes in your editor
2. Save the file - Metro will automatically reload the app
3. Test on your Android development build
4. Commit changes to Git
5. Push to GitHub
6. Create new builds when native code changes (EAS Build)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes and test thoroughly on Android
4. If testing on iOS, document any configuration changes needed
5. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
6. Push to the branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Contact the UMMA-NA development team

## Related Projects

- **Backend API**: [umma-na-backend](https://github.com/Timamamu/umma-na-backend)
- **Web Frontend**: [umma-na-frontend](https://github.com/Timamamu/umma-na-frontend)

---

**Built for maternal health emergency response by Fatima Mamu for the UMMA-NA team**
