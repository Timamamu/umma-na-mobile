// src/navigation/RootNavigation.ts
import { createRef } from 'react';
import { NavigationContainerRef, ParamListBase } from '@react-navigation/native';

// Create a navigation ref that can be used anywhere
export const navigationRef = createRef<NavigationContainerRef<ParamListBase>>();

// Navigate to a specific route
export function navigate(name: string, params?: object) {
  if (navigationRef.current) {
    navigationRef.current.navigate(name, params);
  } else {
    console.warn('Navigation failed: NavigationRef is not initialized');
  }
}

// Go back to previous screen
export function goBack() {
  if (navigationRef.current) {
    navigationRef.current.goBack();
  } else {
    console.warn('Navigation goBack failed: NavigationRef is not initialized');
  }
}

// Get current route name
export function getCurrentRouteName(): string | undefined {
  if (navigationRef.current) {
    return navigationRef.current.getCurrentRoute()?.name;
  }
  return undefined;
}

// Check if a specific route can be navigated back to
export function canGoBack(): boolean {
  return navigationRef.current?.canGoBack() || false;
}

// This function should be called in your App.tsx to initialize the navigation ref
export function setNavigationReady() {
  if (navigationRef.current) {
    console.log('Navigation is ready');
  }
}