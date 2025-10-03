// src/utils/LocationErrorHandling.ts
import * as Location from 'expo-location';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';

/**
 * Error types specific to location services
 */
export enum LocationErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  LOCATION_DISABLED = 'LOCATION_DISABLED',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  LOW_ACCURACY = 'LOW_ACCURACY',
  UNAVAILABLE = 'UNAVAILABLE',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Information about a location error
 */
export interface LocationErrorInfo {
  type: LocationErrorType;
  message: string;
  originalError?: any;
  canRecover: boolean;
}

/**
 * Options for handling location errors
 */
export interface LocationErrorHandlingOptions {
  showAlerts: boolean;
  attemptRecovery: boolean;
  onError?: (error: LocationErrorInfo) => void;
  maxRetries?: number;
}

/**
 * Default options for error handling
 */
const DEFAULT_OPTIONS: LocationErrorHandlingOptions = {
  showAlerts: true,
  attemptRecovery: true,
  maxRetries: 3
};

/**
 * Analyzes an error to determine its type and recovery options
 */
export function analyzeLocationError(error: any): LocationErrorInfo {
  console.log('Analyzing location error:', error);
  
  // Handle permission errors
  if (error.message && error.message.includes('permission')) {
    return {
      type: LocationErrorType.PERMISSION_DENIED,
      message: 'Location permission was denied',
      originalError: error,
      canRecover: true
    };
  }
  
  // Handle disabled location services
  if (error.message && (
    error.message.includes('disabled') || 
    error.message.includes('Location services are not enabled')
  )) {
    return {
      type: LocationErrorType.LOCATION_DISABLED,
      message: 'Location services are disabled',
      originalError: error,
      canRecover: true
    };
  }
  
  // Handle timeout errors
  if (error.message && error.message.includes('timeout')) {
    return {
      type: LocationErrorType.TIMEOUT,
      message: 'Location request timed out',
      originalError: error,
      canRecover: true
    };
  }
  
  // Handle network errors
  if (error.message && (
    error.message.includes('network') || 
    error.message.includes('connection')
  )) {
    return {
      type: LocationErrorType.NETWORK_ERROR,
      message: 'Network error while getting location',
      originalError: error,
      canRecover: false
    };
  }
  
  // Handle low accuracy errors
  if (error.message && error.message.includes('accuracy')) {
    return {
      type: LocationErrorType.LOW_ACCURACY,
      message: 'Location accuracy is too low',
      originalError: error,
      canRecover: true
    };
  }
  
  // Handle general unavailability
  if (error.message && error.message.includes('unavailable')) {
    return {
      type: LocationErrorType.UNAVAILABLE,
      message: 'Location provider is unavailable',
      originalError: error,
      canRecover: false
    };
  }
  
  // Default to unknown error
  return {
    type: LocationErrorType.UNKNOWN,
    message: error.message || 'Unknown location error occurred',
    originalError: error,
    canRecover: false
  };
}

/**
 * Opens device location settings
 */
export async function openLocationSettings(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openSettings();
    } else {
      // For Android
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
      );
    }
  } catch (error) {
    console.error('Error opening location settings:', error);
    // Fallback to general settings if specific location settings fail
    Linking.openSettings().catch(settingsError => 
      console.error('Error opening settings:', settingsError)
    );
  }
}

/**
 * Shows a location error alert with appropriate recovery options
 */
export function showLocationErrorAlert(errorInfo: LocationErrorInfo): Promise<boolean> {
  return new Promise((resolve) => {
    let title = 'Location Error';
    let message = errorInfo.message;
    let buttons = [];
    
    // Customize alerts based on error type
    switch (errorInfo.type) {
      case LocationErrorType.PERMISSION_DENIED:
        title = 'Location Permission Required';
        message = 'To respond to emergency transport requests, UMMA-NA needs access to your location. Please grant location permissions in your device settings.';
        buttons = [
          { 
            text: 'Not Now', 
            style: 'cancel' as const,
            onPress: () => resolve(false)
          },
          {
            text: 'Open Settings',
            style: 'default' as const,
            onPress: async () => {
              await openLocationSettings();
              resolve(true);
            }
          }
        ];
        break;
        
      case LocationErrorType.LOCATION_DISABLED:
        title = 'Location Services Disabled';
        message = 'Location services are turned off on your device. Please enable them to respond to emergency requests.';
        buttons = [
          { 
            text: 'Not Now', 
            style: 'cancel' as const,
            onPress: () => resolve(false)
          },
          {
            text: 'Open Settings',
            style: 'default' as const,
            onPress: async () => {
              await openLocationSettings();
              resolve(true);
            }
          }
        ];
        break;
        
      case LocationErrorType.TIMEOUT:
        title = 'Location Timeout';
        message = 'Could not get your location in time. Would you like to try again?';
        buttons = [
          { 
            text: 'Cancel', 
            style: 'cancel' as const,
            onPress: () => resolve(false)
          },
          {
            text: 'Try Again',
            style: 'default' as const,
            onPress: () => resolve(true)
          }
        ];
        break;
        
      default:
        // General error case
        buttons = [
          { 
            text: 'OK', 
            style: 'default' as const,
            onPress: () => resolve(false)
          }
        ];
        
        // Add retry option if recovery is possible
        if (errorInfo.canRecover) {
          buttons.push({
            text: 'Try Again',
            style: 'default' as const,
            onPress: () => resolve(true)
          });
        }
    }
    
    Alert.alert(title, message, buttons);
  });
}

/**
 * Handle location errors with appropriate UI feedback and recovery attempts
 */
export async function handleLocationError(
  error: any,
  options: LocationErrorHandlingOptions = DEFAULT_OPTIONS
): Promise<boolean> {
  const errorInfo = analyzeLocationError(error);
  
  // Call error callback if provided
  if (options.onError) {
    options.onError(errorInfo);
  }
  
  // Show alert if enabled
  if (options.showAlerts) {
    const shouldRetry = await showLocationErrorAlert(errorInfo);
    return shouldRetry;
  }
  
  return errorInfo.canRecover;
}

/**
 * Checks location services status and handles any issues
 */
export async function verifyLocationServicesEnabled(
  options: LocationErrorHandlingOptions = DEFAULT_OPTIONS
): Promise<boolean> {
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    
    if (!enabled) {
      if (options.showAlerts) {
        const errorInfo: LocationErrorInfo = {
          type: LocationErrorType.LOCATION_DISABLED,
          message: 'Location services are disabled',
          canRecover: true
        };
        
        const shouldOpen = await showLocationErrorAlert(errorInfo);
        if (shouldOpen) {
          await openLocationSettings();
          // Re-check after settings were opened
          return await Location.hasServicesEnabledAsync();
        }
      }
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking location services:', error);
    return false;
  }
}

/**
 * Checks and requests location permissions with error handling
 */
export async function requestLocationPermissionsWithErrorHandling(
  options: LocationErrorHandlingOptions = DEFAULT_OPTIONS
): Promise<boolean> {
  try {
    // First check if location services are enabled
    const servicesEnabled = await verifyLocationServicesEnabled(options);
    if (!servicesEnabled) return false;
    
    // Request foreground permissions
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
    // If foreground permission denied, show error
    if (foregroundStatus !== 'granted') {
      if (options.showAlerts) {
        const errorInfo: LocationErrorInfo = {
          type: LocationErrorType.PERMISSION_DENIED,
          message: 'Foreground location permission denied',
          canRecover: true
        };
        
        const shouldOpen = await showLocationErrorAlert(errorInfo);
        if (shouldOpen) {
          await openLocationSettings();
        }
      }
      return false;
    }
    
    // Request background permissions on iOS
    if (Platform.OS === 'ios') {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      // Log but continue if background permission denied
      if (backgroundStatus !== 'granted') {
        console.log('Background location permission denied on iOS');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    if (options.showAlerts) {
      await handleLocationError(error, options);
    }
    return false;
  }
}

/**
 * Gets current position with retry and error handling
 */
export async function getCurrentPositionWithErrorHandling(
  options: LocationErrorHandlingOptions = DEFAULT_OPTIONS,
  locationOptions: Location.LocationOptions = { accuracy: Location.Accuracy.High }
): Promise<Location.LocationObject | null> {
  // Check if location services and permissions are enabled
  const hasPermission = await requestLocationPermissionsWithErrorHandling({
    ...options,
    showAlerts: false // Handle permissions separately
  });
  
  if (!hasPermission) {
    if (options.showAlerts) {
      const errorInfo: LocationErrorInfo = {
        type: LocationErrorType.PERMISSION_DENIED,
        message: 'Location permission not granted',
        canRecover: true
      };
      
      await showLocationErrorAlert(errorInfo);
    }
    return null;
  }
  
  // Attempt to get location with retries
  let retries = 0;
  const maxRetries = options.maxRetries || DEFAULT_OPTIONS.maxRetries || 3;
  
  while (retries <= maxRetries) {
    try {
      const location = await Location.getCurrentPositionAsync(locationOptions);
      return location;
    } catch (error) {
      retries++;
      console.error(`Location error (attempt ${retries}/${maxRetries}):`, error);
      
      // If we've exceeded max retries, handle the error and return null
      if (retries > maxRetries) {
        if (options.showAlerts) {
          await handleLocationError(error, options);
        }
        return null;
      }
      
      // If we should retry, wait a moment then continue the loop
      if (options.attemptRecovery) {
        // Progressive backoff for retries
        const waitTime = 1000 * Math.min(3, retries);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Try with lower accuracy if we're on later retry attempts
        if (retries > 1 && locationOptions.accuracy === Location.Accuracy.High) {
          locationOptions.accuracy = Location.Accuracy.Balanced;
        }
        
        // Try with even lower accuracy on final attempt
        if (retries === maxRetries && locationOptions.accuracy === Location.Accuracy.Balanced) {
          locationOptions.accuracy = Location.Accuracy.Low;
        }
      } else {
        // If no recovery attempts, just break and return null
        break;
      }
    }
  }
  
  return null;
}

export default {
  LocationErrorType,
  analyzeLocationError,
  handleLocationError,
  openLocationSettings,
  showLocationErrorAlert,
  verifyLocationServicesEnabled,
  requestLocationPermissionsWithErrorHandling,
  getCurrentPositionWithErrorHandling
};