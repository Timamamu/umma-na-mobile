// App.tsx
import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, LogBox, Platform } from 'react-native';
import { NavigationContainer, createNavigationContainerRef, StackActions } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';

// Import services
import LocationService from './src/services/LocationService';
import NotificationService from './src/services/NotificationService';
import StorageService from './src/services/StorageService';

// Import contexts
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

// Ignore specific warnings that aren't relevant
LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered.',
  'Non-serializable values were found in the navigation state',
]);

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Create navigation ref with any type to avoid the typing issues
const navigationRef = createNavigationContainerRef();

// Define only the essential properties in the global namespace
if (typeof global.RootNavigation === 'undefined') {
  global.RootNavigation = {
    navigate: (screen: string, params?: any) => {},
    goBack: () => {}
  };
}

export default function App() {
  // Specify the type for routeNameRef
  const routeNameRef = useRef<string | undefined>(undefined);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Initialize app services
  useEffect(() => {
    async function initializeApp() {
      try {
        console.log('Initializing app services...');
        
        // Initialize storage
        await StorageService.init();
        
        // Initialize notifications
        await NotificationService.init();
        
        // Setup audio for alerts
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        
        // Check for existing user
        const user = await StorageService.getUser();
        
        // Initialize location services only if user is a driver
        if (user && user.role === 'driver') {
          console.log('User is a driver, initializing location service...');
          
          // Check permissions for location
          const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
          
          if (foregroundStatus === 'granted') {
            // If driver is available, start tracking
            if (user.isAvailable) {
              await LocationService.startForegroundTracking(user.id, true);
              await LocationService.startBackgroundTracking(true);
              console.log('Location tracking started for available driver');
            } else {
              // Initialize with less aggressive tracking
              await LocationService.startForegroundTracking(user.id, false);
              console.log('Minimal location tracking started for unavailable driver');
            }
          } else {
            // Try to request permissions
            const granted = await LocationService.requestPermissions();
            if (granted && user.isAvailable) {
              await LocationService.startForegroundTracking(user.id, true);
              await LocationService.startBackgroundTracking(true);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    }
    
    initializeApp();
    
    // Set up app state change handler for foreground/background transitions
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      handleAppStateChange(nextAppState);
    });
    
    // Clean up on unmount
    return () => {
      // Remove app state listener
      subscription.remove();
      
      // Stop location tracking
      LocationService.stopTracking().catch(error => 
        console.error('Error stopping location tracking:', error)
      );
    };
  }, []);
  
  // Handle app state changes
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // Only proceed if app is becoming active again after being in background
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('App has come to the foreground!');
      
      // Check user and refresh location if needed
      try {
        const user = await StorageService.getUser();
        
        if (user && user.role === 'driver' && user.isAvailable) {
          console.log('Refreshing location for active driver');
          
          // Request fresh location
          await LocationService.requestImmediateUpdate(user.id);
        }
      } catch (error) {
        console.error('Error refreshing on app foreground:', error);
      }
    }
    
    // Update the current state
    appState.current = nextAppState;
  };
  
  // Set up global navigation reference when navigation is ready
  const onNavigationReady = () => {
    routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
    
    // Update the existing RootNavigation object
    if (global.RootNavigation) {
      // Update the navigate function - fix the navigation issue
      global.RootNavigation.navigate = (name: string, params?: any) => {
        if (navigationRef.current?.isReady()) {
          // Use separate conditions to avoid the type error
          if (params) {
            // @ts-ignore - Ignore the type checking here
            navigationRef.current.navigate(name, params);
          } else {
            // @ts-ignore - Ignore the type checking here
            navigationRef.current.navigate(name);
          }
        }
      };
      
      // Update the goBack function
      global.RootNavigation.goBack = () => {
        if (navigationRef.current?.isReady() && navigationRef.current.canGoBack()) {
          navigationRef.current.goBack();
        }
      };
      
      // Add any extension functions as properties
      // @ts-ignore - Use ts-ignore to bypass the property check
      global.RootNavigation.getCurrentRouteName = () => {
        return navigationRef.current?.getCurrentRoute()?.name;
      };
      
      // @ts-ignore - Use ts-ignore to bypass the property check
      global.RootNavigation.canGoBack = () => {
        return navigationRef.current?.canGoBack() || false;
      };
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer 
        ref={navigationRef}
        onReady={onNavigationReady}
        onStateChange={() => {
          const previousRouteName = routeNameRef.current;
          const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
          
          if (previousRouteName !== currentRouteName) {
            // Save the current route name
            routeNameRef.current = currentRouteName;
          }
        }}
      >
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}