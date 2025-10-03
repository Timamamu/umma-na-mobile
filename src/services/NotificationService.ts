// src/services/NotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';

// Import navigation functions
import { NavigationContainerRef } from '@react-navigation/native';

// Define global navigation type
declare global {
  // Extend the global namespace
  var RootNavigation: {
    navigate: (routeName: string, params?: any) => void;
    goBack: () => void;
    getCurrentRouteName?: () => string | undefined;
    canGoBack?: () => boolean;
  };
}

// Define notification channels for Android
const EMERGENCY_CHANNEL_ID = 'emergency-notifications';
const LOCATION_CHANNEL_ID = 'location-notifications';
const GENERAL_CHANNEL_ID = 'general-notifications';

// Notification types
export enum NotificationType {
  EMERGENCY = 'EMERGENCY',
  LOCATION_UPDATE = 'LOCATION_UPDATE',
  RIDE_REQUEST = 'RIDE_REQUEST',
  RIDE_ACCEPTED = 'RIDE_ACCEPTED',
  RIDE_CANCELLED = 'RIDE_CANCELLED',
  GENERAL = 'GENERAL',
}

// Notification data structure
export interface NotificationData {
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    screen?: string;
    params?: any;
    rideId?: string;
    emergencyLevel?: string;
    needsImmediate?: boolean;
    [key: string]: any;
  };
  sound?: boolean;
  vibrate?: boolean;
  badge?: number;
}

// Device token storage
let devicePushToken: string | null = null;

// Handle storing notification data for debugging
const MAX_NOTIFICATION_HISTORY = 20;
let notificationHistory: any[] = [];

class NotificationService {
  // Initialize the notification service
  static async init(): Promise<boolean> {
    try {
      // Create notification channels for Android
      if (Platform.OS === 'android') {
        await this.createAndroidChannels();
      }

      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          // Get notification data
          const data = notification.request.content.data;
          const type = data.type || NotificationType.GENERAL;
          
          // Different handling based on type
          if (type === NotificationType.EMERGENCY) {
            // Emergency notifications always show alert, play sound, and vibrate
            return {
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
            };
          } else if (type === NotificationType.LOCATION_UPDATE) {
            // Location updates should be silent
            return {
              shouldShowAlert: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
            };
          } else {
            // Default handling for other notification types
            return {
              shouldShowAlert: true,
              shouldPlaySound: data.sound !== false,
              shouldSetBadge: true,
            };
          }
        },
      });

      // Set up notification response listener
      this.setupNotificationResponseListener();

      // Register for push notifications if in real device
      if (Device.isDevice) {
        const token = await this.registerForPushNotifications();
        if (token) {
          devicePushToken = token;
          await AsyncStorage.setItem('devicePushToken', token);
          console.log('Push notification token registered:', token);
        }
      } else {
        console.log('Push notifications not available in simulator/emulator');
      }

      // Load notification history from storage
      await this.loadNotificationHistory();

      return true;
    } catch (error) {
      console.error('Error initializing notification service:', error);
      return false;
    }
  }

  // Create notification channels for Android
  private static async createAndroidChannels(): Promise<void> {
    // Emergency channel - highest priority
    await Notifications.setNotificationChannelAsync(EMERGENCY_CHANNEL_ID, {
      name: 'Emergency Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF453A',
      sound: 'emergency_alert.wav', // Custom sound for emergencies
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // Location updates channel - lower priority
    await Notifications.setNotificationChannelAsync(LOCATION_CHANNEL_ID, {
      name: 'Location Updates',
      importance: Notifications.AndroidImportance.LOW,
      enableVibrate: false,
      showBadge: false,
    });

    // General notifications channel
    await Notifications.setNotificationChannelAsync(GENERAL_CHANNEL_ID, {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5B3657',
      enableVibrate: true,
      showBadge: true,
    });
  }

  // Set up listener for notification responses (taps)
  private static setupNotificationResponseListener(): void {
    Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data;
        console.log('Notification tapped:', data);
        
        // Add to history
        this.addToNotificationHistory({
          type: 'response',
          data,
          timestamp: new Date().toISOString(),
        });

        // Handle navigation if screen is specified
        if (data.screen && global.RootNavigation) {
          global.RootNavigation.navigate(data.screen, data.params || {});
        }
        
        // For ride requests, navigate to the appropriate screen
        if (data.type === NotificationType.RIDE_REQUEST && data.rideId) {
          if (global.RootNavigation) {
            global.RootNavigation.navigate('DriverPendingRequests', { 
              initialRideId: data.rideId 
            });
          }
        }
      } catch (error) {
        console.error('Error handling notification response:', error);
      }
    });
  }

  // Register for push notifications
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if we already have a token in storage
      const existingToken = await AsyncStorage.getItem('devicePushToken');
      if (existingToken) {
        return existingToken;
      }

      // Check permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // If permission not determined, request it
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: true,
            allowCriticalAlerts: true,
            provideAppNotificationSettings: true,
            allowProvisional: true,
          },
        });
        finalStatus = status;
      }
      
      // Return null if permission not granted
      if (finalStatus !== 'granted') {
        console.log('Permission for notifications not granted');
        return null;
      }
      
      // Get push token
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      // Configure for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
      
      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  // Check if notifications are permitted
  static async areNotificationsAllowed(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  // Request notification permissions if not already granted
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: true,
          allowCriticalAlerts: true,
          provideAppNotificationSettings: true,
        },
      });
      
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Schedule a notification
  static async scheduleNotification(notification: NotificationData): Promise<string | null> {
    try {
      // Determine the channel based on notification type (for Android)
      let channelId = GENERAL_CHANNEL_ID;
      
      if (notification.type === NotificationType.EMERGENCY) {
        channelId = EMERGENCY_CHANNEL_ID;
      } else if (notification.type === NotificationType.LOCATION_UPDATE) {
        channelId = LOCATION_CHANNEL_ID;
      }
      
      // Prepare notification content
      const notificationContent: Notifications.NotificationContentInput = {
        title: notification.title,
        body: notification.body,
        data: {
          ...notification.data,
          type: notification.type,
        },
        sound: notification.sound !== false,
        badge: notification.badge,
      };
      
      // Schedule the notification
      const identifier = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: Platform.OS === 'android' ? { channelId } : null,
      });
      
      // Add to history for debugging
      this.addToNotificationHistory({
        id: identifier,
        content: notificationContent,
        timestamp: new Date().toISOString(),
      });
      
      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  // Schedule an emergency notification (with special handling)
  static async scheduleEmergencyNotification(title: string, body: string, data: any = {}): Promise<string | null> {
    // For emergency notifications, ensure sound and vibration are enabled
    return this.scheduleNotification({
      type: NotificationType.EMERGENCY,
      title,
      body,
      data: {
        ...data,
        needsImmediate: true, // Flag for immediate attention
      },
      sound: true,
      vibrate: true,
    });
  }

  // Schedule a ride request notification
  static async scheduleRideRequestNotification(
    rideId: string,
    emergencyLevel: string,
    patientLocation: string,
    symptoms: string[]
  ): Promise<string | null> {
    // Format the symptoms for display
    const symptomsText = symptoms.length > 0 
      ? `Symptoms: ${symptoms.join(', ')}`
      : 'No specific symptoms reported';
    
    // Create appropriate title based on emergency level
    const title = emergencyLevel === 'HIGH'
      ? '🚨 URGENT: Emergency Ride Requested'
      : '🔔 New Ride Request Available';
    
    return this.scheduleNotification({
      type: NotificationType.RIDE_REQUEST,
      title,
      body: `${patientLocation}. ${symptomsText}`,
      data: {
        rideId,
        emergencyLevel,
        screen: 'DriverPendingRequests',
        params: { initialRideId: rideId },
      },
      sound: true,
      vibrate: true,
    });
  }

  // Cancel a scheduled notification
  static async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  // Cancel all scheduled notifications
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  // Get the badge count
  static async getBadgeCount(): Promise<number> {
    if (Platform.OS === 'ios') {
      return await Notifications.getBadgeCountAsync();
    }
    return 0;
  }

  // Set the badge count
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  // Get the device push token
  static getDevicePushToken(): string | null {
    return devicePushToken;
  }

  // Add a notification to history (for debugging)
  private static async addToNotificationHistory(notification: any): Promise<void> {
    notificationHistory.unshift(notification);
    
    // Trim to max length
    if (notificationHistory.length > MAX_NOTIFICATION_HISTORY) {
      notificationHistory = notificationHistory.slice(0, MAX_NOTIFICATION_HISTORY);
    }
    
    // Save to storage
    try {
      await AsyncStorage.setItem('notificationHistory', JSON.stringify(notificationHistory));
    } catch (error) {
      console.error('Error saving notification history:', error);
    }
  }

  // Load notification history from storage
  private static async loadNotificationHistory(): Promise<void> {
    try {
      const history = await AsyncStorage.getItem('notificationHistory');
      if (history) {
        notificationHistory = JSON.parse(history);
      }
    } catch (error) {
      console.error('Error loading notification history:', error);
    }
  }

  // Get notification history (for debugging)
  static getNotificationHistory(): any[] {
    return notificationHistory;
  }

  // Clear notification history
  static async clearNotificationHistory(): Promise<void> {
    notificationHistory = [];
    try {
      await AsyncStorage.removeItem('notificationHistory');
    } catch (error) {
      console.error('Error clearing notification history:', error);
    }
  }

  // Open app settings to let user manage notification permissions
  static openNotificationSettings(): void {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      // For Android, we need to check the API level
      Linking.openSettings();
    }
  }

  // Handle incoming push notification data
  static async handlePushNotification(data: any): Promise<void> {
    try {
      console.log('Received push notification data:', data);
      
      // Add to history
      this.addToNotificationHistory({
        type: 'push',
        data,
        timestamp: new Date().toISOString(),
      });
      
      // Extract notification type and other data
      const type = data.type || NotificationType.GENERAL;
      
      // For ride requests, schedule a local notification
      if (type === NotificationType.RIDE_REQUEST && data.rideId) {
        await this.scheduleRideRequestNotification(
          data.rideId,
          data.emergencyLevel || 'MEDIUM',
          data.patientLocation || 'Location not specified',
          data.symptoms || []
        );
      } else {
        // For other types, create a generic notification
        await this.scheduleNotification({
          type: type as NotificationType,
          title: data.title || 'UMMA-NA Notification',
          body: data.body || 'You have a new notification',
          data: data,
        });
      }
    } catch (error) {
      console.error('Error handling push notification:', error);
    }
  }
}

export default NotificationService;