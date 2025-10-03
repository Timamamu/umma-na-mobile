//src/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import RoleSelectScreen from '../screens/RoleSelectScreen';
import LoginScreen from '../screens/LoginScreen';
import ChipsHome from '../screens/chips/ChipsHome';
import DriverHome from '../screens/driver/DriverHome';
import RequestRideScreen from '../screens/chips/RequestRide';
import ChipsHistoryScreen from '../screens/chips/ChipsHistory';
import DriverPendingRequests from '../screens/driver/DriverPendingRequests';
import ActiveRideScreen from '../screens/chips/ChipsActiveRide';
import DriverActiveRideScreen from '../screens/driver/DriverActiveRide';
import DriverRideHistoryScreen from '../screens/driver/DriverRideHistory';
import SettingsScreen from '../screens/SettingsScreen';
import SupportScreen from '../screens/SupportScreen';

//delete start
import TestSymptomSelector from '../screens/TestSymptomSelector';
//delete end

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ChipsHome" component={ChipsHome} />
      <Stack.Screen name="DriverHome" component={DriverHome} />
      <Stack.Screen name="RequestRide" component={RequestRideScreen} />
      <Stack.Screen name="ChipsHistory" component={ChipsHistoryScreen} />
      <Stack.Screen name="DriverPendingRequests" component={DriverPendingRequests} />
      <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
      <Stack.Screen name="DriverActiveRide" component={DriverActiveRideScreen} />
      <Stack.Screen name="DriverRideHistory" component={DriverRideHistoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="TestSymptomSelector" component={TestSymptomSelector} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
