// src/services/StorageService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define user type
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'chips' | 'driver';
  username?: string;
  isAvailable?: boolean;
  catchmentAreaIds?: string[];
  assignedCatchmentAreas?: string[];
  [key: string]: any;
}

// Storage keys
const STORAGE_KEYS = {
  USER: 'user',
  TOKEN: 'token',
  PUSH_TOKEN: 'pushToken',
  LAST_LOCATION: 'lastKnownLocation',
  APP_SETTINGS: 'appSettings',
};

class StorageService {
  // Initialize the storage service
  static async init(): Promise<boolean> {
    try {
      // You could perform any startup checks here
      return true;
    } catch (error) {
      console.error('Error initializing StorageService:', error);
      return false;
    }
  }

  // User methods
  static async storeUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user:', error);
      throw error;
    }
  }

  static async getUser(): Promise<User | null> {
    try {
      const userString = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  static async updateUser(updates: Partial<User>): Promise<User | null> {
    try {
      const currentUser = await this.getUser();
      if (!currentUser) return null;

      const updatedUser = { ...currentUser, ...updates };
      await this.storeUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async clearUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    } catch (error) {
      console.error('Error clearing user:', error);
      throw error;
    }
  }

  // Auth token methods
  static async storeToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } catch (error) {
      console.error('Error storing token:', error);
      throw error;
    }
  }

  static async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  static async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    } catch (error) {
      console.error('Error clearing token:', error);
      throw error;
    }
  }

  // Push notification token methods
  static async storePushToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
    } catch (error) {
      console.error('Error storing push token:', error);
      throw error;
    }
  }

  static async getPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // App settings methods
  static async storeAppSettings(settings: any): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error storing app settings:', error);
      throw error;
    }
  }

  static async getAppSettings(): Promise<any | null> {
    try {
      const settingsString = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      return settingsString ? JSON.parse(settingsString) : null;
    } catch (error) {
      console.error('Error getting app settings:', error);
      return null;
    }
  }

  // Helper to clear all data (for logout)
  static async clearAll(): Promise<void> {
    try {
      // Get all keys
      const keys = await AsyncStorage.getAllKeys();
      // Clear all keys
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing all storage:', error);
      throw error;
    }
  }
}

export default StorageService;