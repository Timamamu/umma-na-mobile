import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../constants';

// Define the root stack param list type
type RootStackParamList = {
  Splash: undefined;
  RoleSelect: undefined;
  Login: { role: 'chips' | 'driver' };
  ChipsHome: undefined;
  DriverHome: undefined;
  // Add other screens as needed
};

// Define the navigation prop type
type SplashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

const SplashScreen = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate logo first
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Then animate text
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        // Wait a bit before navigating away
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'RoleSelect' }],
          });
        }, 1000);
      });
    });
  }, [fadeAnim, scaleAnim, textFadeAnim, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: COLORS.primary }]}>
      <Animated.Image
        source={require('../../assets/icon.png')}
        style={[
          styles.logo,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
        resizeMode="contain"
      />
      <Animated.View style={{ opacity: textFadeAnim }}>
        <Text style={styles.appName}>UMMA-NA</Text>
        <Text style={styles.tagline}>Emergency Transport System</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.secondary,
    textAlign: 'center',
    marginTop: 20,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 1,
  },
});

export default SplashScreen;