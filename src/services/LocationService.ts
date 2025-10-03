// src/services/LocationService.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateDriverLocation } from './api';
import StorageService from './StorageService';

// Define task names
const LOCATION_TRACKING_TASK = 'location-tracking-task';
const BACKGROUND_FETCH_TASK = 'background-fetch-task';
const IMMEDIATE_UPDATE_TASK = 'immediate-update-task';

// Tracking intervals (in milliseconds)
const FOREGROUND_INTERVAL = 2 * 60 * 1000; // 2 minutes
const BACKGROUND_INTERVAL = 10 * 60 * 1000; // 10 minutes
const AVAILABLE_DRIVER_INTERVAL = 5 * 60 * 1000; // 5 minutes
const UNAVAILABLE_DRIVER_INTERVAL = 15 * 60 * 1000; // 15 minutes

// Accuracy levels for different modes
const NORMAL_ACCURACY = Location.Accuracy.Balanced;
const HIGH_ACCURACY = Location.Accuracy.High;
const LOW_ACCURACY = Location.Accuracy.Low;

// Distance thresholds
const AVAILABLE_DISTANCE_FILTER = 50; // meters
const UNAVAILABLE_DISTANCE_FILTER = 250; // meters

// State management
let locationSubscription: Location.LocationSubscription | null = null;
let isTracking = false;
let lastUpdateTime = 0;
let pendingImmediateUpdate = false;
let locationUpdateTimeout: NodeJS.Timeout | null = null;
let retryCount = 0;
const MAX_RETRIES = 3;
let appState = 'active';

// Save the last known location to storage for fallback
const saveLastKnownLocation = async (location: Location.LocationObject) => {
  try {
    await AsyncStorage.setItem('lastKnownLocation', JSON.stringify({
      coords: location.coords,
      timestamp: location.timestamp
    }));
  } catch (error) {
    console.error('Error saving last known location:', error);
  }
};

// Get the last known location from storage
const getLastKnownLocation = async (): Promise<Location.LocationObject | null> => {
  try {
    const locationString = await AsyncStorage.getItem('lastKnownLocation');
    if (locationString) {
      return JSON.parse(locationString);
    }
    return null;
  } catch (error) {
    console.error('Error getting last known location:', error);
    return null;
  }
};

// Define the location task handler
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Location tracking task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
  
  if (data) {
    // The type is correctly handled by TaskManager internally
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];
    
    // Only update if we have a valid location
    if (location && location.coords) {
      try {
        // Save for fallback
        await saveLastKnownLocation(location);
        
        // Get current user info from storage - use StorageService to prevent possible issues
        const user = await StorageService.getUser();
        if (user && user.id && user.role === 'driver') {
          await updateDriverLocation(
            user.id,
            location.coords.latitude,
            location.coords.longitude
          );
          console.log('Background location updated:', location.coords);
        }
        
        // Update the last update time
        lastUpdateTime = Date.now();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (err) {
        console.error('Error updating location in background:', err);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    }
  }
  return BackgroundFetch.BackgroundFetchResult.NoData;
});

// Background fetch task for periodic updates when app is in background
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async ({ data, error }) => {
  try {
    const now = Date.now();
    
    // Get user to check if available/unavailable for different timing
    const user = await StorageService.getUser();
    const isAvailable = user?.isAvailable || false;
    
    // Determine the appropriate interval based on driver availability
    const appropriateInterval = isAvailable ? AVAILABLE_DRIVER_INTERVAL : UNAVAILABLE_DRIVER_INTERVAL;
    
    // Check if it's time for a new update
    if (now - lastUpdateTime >= appropriateInterval || pendingImmediateUpdate) {
      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: pendingImmediateUpdate ? HIGH_ACCURACY : isAvailable ? NORMAL_ACCURACY : LOW_ACCURACY,
      });
      
      // Save for fallback
      await saveLastKnownLocation(location);
      
      if (user && user.id && user.role === 'driver') {
        await updateDriverLocation(
          user.id,
          location.coords.latitude,
          location.coords.longitude
        );
        console.log('Background fetch location updated:', location.coords);
        
        // Reset flag after successful immediate update
        if (pendingImmediateUpdate) {
          pendingImmediateUpdate = false;
        }
        
        lastUpdateTime = now;
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Background fetch error:', error);
    // Try to get and send last known location on error
    try {
      if (pendingImmediateUpdate) {
        const lastLocation = await getLastKnownLocation();
        if (lastLocation && lastLocation.coords) {
          const user = await StorageService.getUser();
          if (user && user.id && user.role === 'driver') {
            await updateDriverLocation(
              user.id,
              lastLocation.coords.latitude,
              lastLocation.coords.longitude
            );
            pendingImmediateUpdate = false;
            console.log('Fallback location sent on error:', lastLocation.coords);
            return BackgroundFetch.BackgroundFetchResult.NewData;
          }
        }
      }
    } catch (fallbackError) {
      console.error('Error sending fallback location:', fallbackError);
    }
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Specific task for immediate location updates
TaskManager.defineTask(IMMEDIATE_UPDATE_TASK, async ({ data, error }) => {
  try {
    console.log('Executing immediate location update task');
    const location = await Location.getCurrentPositionAsync({
      accuracy: HIGH_ACCURACY,
    });
    
    await saveLastKnownLocation(location);
    
    const user = await StorageService.getUser();
    if (user && user.id && user.role === 'driver') {
      await updateDriverLocation(
        user.id,
        location.coords.latitude,
        location.coords.longitude
      );
      console.log('Immediate task location updated:', location.coords);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Immediate update task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Handle app state changes
AppState.addEventListener('change', (nextAppState) => {
  appState = nextAppState;
  console.log('App state changed to:', nextAppState);
});

class LocationService {
  // Check existing permissions
  static async checkPermissions(): Promise<Location.LocationPermissionResponse> {
    return await Location.getForegroundPermissionsAsync();
  }
  
  // Request all required permissions
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission denied');
        return false;
      }
      
      // Request background permissions on iOS
      if (Platform.OS === 'ios') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.log('Background location permission denied on iOS');
          // Can still continue with foreground only on iOS
        }
      }
      
      // Request notification permissions for location update requests
      const { status: notificationStatus } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      
      if (notificationStatus !== 'granted') {
        console.log('Notification permission denied');
        // Can still continue without notifications
      }
      
      return foregroundStatus === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }
  
  // Check if any location permission is granted
  static async hasAnyLocationPermission(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      
      // On iOS, also check background permission
      if (Platform.OS === 'ios') {
        const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
        return foregroundStatus === 'granted' || backgroundStatus === 'granted';
      }
      
      return foregroundStatus === 'granted';
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }
  
  // Get location permission status
  static async getPermissionStatus(): Promise<{
    foreground: string;
    background: string;
  }> {
    try {
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      let backgroundStatus = 'undetermined';
      
      if (Platform.OS === 'ios') {
        const backgroundResponse = await Location.getBackgroundPermissionsAsync();
        backgroundStatus = backgroundResponse.status;
      } else {
        // On Android, if foreground is granted, we consider background available too
        backgroundStatus = foregroundStatus;
      }
      
      return { foreground: foregroundStatus, background: backgroundStatus };
    } catch (error) {
      console.error('Error getting permission status:', error);
      return { foreground: 'undetermined', background: 'undetermined' };
    }
  }
  
  // Start tracking location in the foreground
  static async startForegroundTracking(userId: string, isAvailable: boolean): Promise<boolean> {
    try {
      const hasPermissions = await this.hasAnyLocationPermission();
      if (!hasPermissions) {
        const granted = await this.requestPermissions();
        if (!granted) return false;
      }
      
      // Stop any existing tracking
      await this.stopTracking();
      
      // Register background fetch task if not already registered
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
          minimumInterval: Math.floor((isAvailable ? AVAILABLE_DRIVER_INTERVAL : UNAVAILABLE_DRIVER_INTERVAL) / 1000), // Convert to seconds
          stopOnTerminate: false,
          startOnBoot: true,
        });
      }
      
      // Register immediate update task
      const isImmediateRegistered = await TaskManager.isTaskRegisteredAsync(IMMEDIATE_UPDATE_TASK);
      if (!isImmediateRegistered) {
        await BackgroundFetch.registerTaskAsync(IMMEDIATE_UPDATE_TASK, {
          minimumInterval: 60, // Can be triggered as frequently as once per minute
          stopOnTerminate: false,
          startOnBoot: true,
        });
      }
      
      // Set accuracy and interval based on driver availability
      const accuracy = isAvailable ? NORMAL_ACCURACY : LOW_ACCURACY;
      const timeInterval = isAvailable ? FOREGROUND_INTERVAL : BACKGROUND_INTERVAL;
      const distanceInterval = isAvailable ? AVAILABLE_DISTANCE_FILTER : UNAVAILABLE_DISTANCE_FILTER;
      
      // Start location subscription in foreground
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy,
          distanceInterval, // Update if moved at least X meters
          timeInterval,
        },
        async (location) => {
          try {
            // Save for fallback
            await saveLastKnownLocation(location);
            
            await updateDriverLocation(
              userId,
              location.coords.latitude,
              location.coords.longitude
            );
            console.log('Foreground location updated:', location.coords);
            lastUpdateTime = Date.now();
          } catch (error) {
            console.error('Error updating location:', error);
          }
        }
      );
      
      isTracking = true;
      console.log('Foreground location tracking started with settings:', {
        accuracy,
        timeInterval: timeInterval / 1000,
        distanceInterval,
        isAvailable
      });
      return true;
    } catch (error) {
      console.error('Error starting foreground tracking:', error);
      return false;
    }
  }
  
  // Start tracking location in the background
  static async startBackgroundTracking(isAvailable: boolean = true): Promise<boolean> {
    try {
      const hasPermissions = await this.hasAnyLocationPermission();
      if (!hasPermissions) {
        const granted = await this.requestPermissions();
        if (!granted) return false;
      }
      
      // Configure accuracy and intervals based on driver availability
      const accuracy = isAvailable ? NORMAL_ACCURACY : LOW_ACCURACY;
      const timeInterval = isAvailable ? AVAILABLE_DRIVER_INTERVAL : UNAVAILABLE_DRIVER_INTERVAL;
      const distanceInterval = isAvailable ? AVAILABLE_DISTANCE_FILTER : UNAVAILABLE_DISTANCE_FILTER;
      
      // Start background location tracking
      await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
        accuracy,
        timeInterval,
        distanceInterval,
        // Use device motion to optimize accuracy vs battery
        activityType: Location.ActivityType.AutomotiveNavigation,
        // Enable Wi-Fi and cell tower positioning for better battery efficiency
        foregroundService: {
          notificationTitle: "UMMA-NA Driver",
          notificationBody: "Location tracking active for emergency response",
          notificationColor: "#5B3657",
        },
        showsBackgroundLocationIndicator: true,
        // Only getting significant changes when driver is unavailable helps save battery
        pausesUpdatesAutomatically: !isAvailable,
      });
      
      isTracking = true;
      console.log('Background location tracking started with settings:', {
        accuracy,
        timeInterval: timeInterval / 1000,
        distanceInterval,
        isAvailable
      });
      return true;
    } catch (error) {
      console.error('Error starting background tracking:', error);
      
      // If permission error, show notification to user
      if (error instanceof Error && error.message.includes('permission')) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'Location Permission Required',
            body: 'Please enable location permissions for UMMA-NA to respond to emergencies',
            data: { screen: 'Settings' },
          },
          trigger: null,
        });
      }
      return false;
    }
  }
  
  // Stop all location tracking
  static async stopTracking(): Promise<void> {
    try {
      if (locationSubscription) {
        await locationSubscription.remove();
        locationSubscription = null;
      }
      
      const isBgTaskRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
      if (isBgTaskRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
      }
      
      isTracking = false;
      console.log('Location tracking stopped');
      
      // Clear any pending update timeout
      if (locationUpdateTimeout) {
        clearTimeout(locationUpdateTimeout);
        locationUpdateTimeout = null;
      }
    } catch (error) {
      console.error('Error stopping tracking:', error);
    }
  }
  
  // Request an immediate location update
  static async requestImmediateUpdate(userId: string): Promise<boolean> {
    try {
      pendingImmediateUpdate = true;
      retryCount = 0;
      console.log('Requesting immediate location update');
      
      // If app is in foreground, try direct update
      if (appState === 'active') {
        try {
          // Get current location with high accuracy
          const location = await Location.getCurrentPositionAsync({
            accuracy: HIGH_ACCURACY,
          });
          
          // Save for fallback
          await saveLastKnownLocation(location);
          
          // Update location on the server
          await updateDriverLocation(
            userId,
            location.coords.latitude,
            location.coords.longitude
          );
          
          console.log('Immediate location update successful:', location.coords);
          lastUpdateTime = Date.now();
          pendingImmediateUpdate = false;
          
          return true;
        } catch (foregroundError) {
          console.error('Foreground immediate location error:', foregroundError);
          // Fall through to background methods on error
        }
      }
      
      // Try alternate approach for background updates
      try {
        // For iOS, we can attempt to manually start a task
        if (Platform.OS === 'ios') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: HIGH_ACCURACY,
          });
          
          await saveLastKnownLocation(location);
          
          if (userId) {
            await updateDriverLocation(
              userId,
              location.coords.latitude,
              location.coords.longitude
            );
            pendingImmediateUpdate = false;
            return true;
          }
        }
      } catch (taskError) {
        console.error('Error with manual location update:', taskError);
      }
      
      // If we're in background or task methods failed, use the flag
      pendingImmediateUpdate = true;
      
      // Send fallback location from storage if available
      const fallbackLocation = await getLastKnownLocation();
      if (fallbackLocation && fallbackLocation.coords) {
        await updateDriverLocation(
          userId,
          fallbackLocation.coords.latitude,
          fallbackLocation.coords.longitude
        );
        console.log('Sent fallback location while waiting for fresh update:', fallbackLocation.coords);
      }
      
      // Set a timeout to reset the flag in case the update never happens
      if (locationUpdateTimeout) {
        clearTimeout(locationUpdateTimeout);
      }
      
      locationUpdateTimeout = setTimeout(() => {
        pendingImmediateUpdate = false;
        console.log('Immediate update request timed out');
      }, 60000); // 60 second timeout
      
      return true;
    } catch (error) {
      console.error('Error getting immediate location update:', error);
      
      // Try to use fallback location after a few failed attempts
      if (retryCount >= MAX_RETRIES) {
        try {
          const fallbackLocation = await getLastKnownLocation();
          if (fallbackLocation && fallbackLocation.coords) {
            await updateDriverLocation(
              userId,
              fallbackLocation.coords.latitude,
              fallbackLocation.coords.longitude
            );
            console.log('Using fallback location after retries:', fallbackLocation.coords);
            pendingImmediateUpdate = false;
            return true;
          }
        } catch (fallbackError) {
          console.error('Error using fallback location:', fallbackError);
        }
      }
      
      retryCount++;
      pendingImmediateUpdate = false;
      return false;
    }
  }
  
  // Retry with progressively lower accuracy if high accuracy fails
  static async getLocationWithFallback(userId: string): Promise<boolean> {
    try {
      // Try high accuracy first
      const location = await Location.getCurrentPositionAsync({
        accuracy: HIGH_ACCURACY,
      });
      
      await saveLastKnownLocation(location);
      await updateDriverLocation(
        userId,
        location.coords.latitude,
        location.coords.longitude
      );
      
      return true;
    } catch (highAccError) {
      console.error('High accuracy location failed, trying balanced:', highAccError);
      
      try {
        // Try balanced accuracy
        const location = await Location.getCurrentPositionAsync({
          accuracy: NORMAL_ACCURACY,
        });
        
        await saveLastKnownLocation(location);
        await updateDriverLocation(
          userId,
          location.coords.latitude,
          location.coords.longitude
        );
        
        return true;
      } catch (balancedError) {
        console.error('Balanced accuracy failed, trying low accuracy:', balancedError);
        
        try {
          // Try low accuracy
          const location = await Location.getCurrentPositionAsync({
            accuracy: LOW_ACCURACY,
          });
          
          await saveLastKnownLocation(location);
          await updateDriverLocation(
            userId,
            location.coords.latitude,
            location.coords.longitude
          );
          
          return true;
        } catch (lowAccError) {
          console.error('All accuracy levels failed:', lowAccError);
          
          // Try to use last known location
          const lastLocation = await getLastKnownLocation();
          if (lastLocation && lastLocation.coords) {
            await updateDriverLocation(
              userId,
              lastLocation.coords.latitude,
              lastLocation.coords.longitude
            );
            console.log('Using last known location after all accuracy levels failed');
            return true;
          }
          
          return false;
        }
      }
    }
  }
  
  // Check if tracking is active
  static isTrackingActive(): boolean {
    return isTracking;
  }
  
  // Get the time of the last successful update
  static getLastUpdateTime(): number {
    return lastUpdateTime;
  }
  
  // Toggle driver availability and adjust tracking accordingly
  static async toggleDriverAvailability(userId: string, isAvailable: boolean): Promise<boolean> {
    try {
      if (isAvailable) {
        // Start more aggressive tracking when driver is available
        const bgStarted = await this.startBackgroundTracking(true);
        const fgStarted = await this.startForegroundTracking(userId, true);
        
        // Request an immediate update to confirm location
        await this.requestImmediateUpdate(userId);
        
        return bgStarted || fgStarted;
      } else {
        // When driver is unavailable, reduce update frequency
        // Stop current tracking and restart with less aggressive settings
        await this.stopTracking();
        
        const bgStarted = await this.startBackgroundTracking(false);
        const fgStarted = await this.startForegroundTracking(userId, false);
        
        // Send one final update with the current position
        await this.requestImmediateUpdate(userId);
        
        return bgStarted || fgStarted;
      }
    } catch (error) {
      console.error('Error toggling driver availability:', error);
      return false;
    }
  }
  
  // Get last known location (for UI display)
  static async getLastLocation(): Promise<Location.LocationObject | null> {
    return await getLastKnownLocation();
  }
  
  // Return tracking stats for UI display
  static getTrackingStats() {
    return {
      isTracking,
      lastUpdateTime,
      pendingImmediateUpdate,
      appState
    };
  }
}

export default LocationService;