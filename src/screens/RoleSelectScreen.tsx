import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FontAwesome5 } from '@expo/vector-icons';

// Define navigation types
type RootStackParamList = {
  RoleSelect: undefined;
  Login: { role: 'chips' | 'driver' };
  ChipsHome: undefined;
  DriverHome: undefined;
  //TestSymptomSelector: undefined;
  // Add other screens as needed
};

type RoleSelectScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'RoleSelect'>;

const RoleSelectScreen: React.FC = () => {
  const navigation = useNavigation<RoleSelectScreenNavigationProp>();

  const handleRoleSelect = (role: 'chips' | 'driver') => {
    navigation.navigate('Login', { role });
  };

  //delete start
  
  //delete end

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/icon.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.instruction}>Select your role to continue</Text>
        
        <TouchableOpacity 
          style={styles.roleButton} 
          onPress={() => handleRoleSelect('chips')}
        >
          <View style={styles.roleIconContainer}>
            <FontAwesome5 
              name="user-nurse" 
              size={40} 
              color={COLORS.primary} 
            />
          </View>
          <View style={styles.roleTextContainer}>
            <Text style={styles.roleTitle}>CHIPS Agent</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.roleButton} 
          onPress={() => handleRoleSelect('driver')}
        >
          <View style={styles.roleIconContainer}>
            <FontAwesome5 
              name="car" 
              size={40} 
              color={COLORS.primary} 
            />
          </View>
          <View style={styles.roleTextContainer}>
            <Text style={styles.roleTitle}>ETS Driver</Text>
          </View>
        </TouchableOpacity>





      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by UMMA-NA</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary, // Using the primary plum color from constants
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 100, // Position logo lower on the screen
  },
  logo: {
    width: 120, // Increased size from 80 to 120
    height: 120, // Increased size from 80 to 120
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  instruction: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 30,
    color: COLORS.secondary, // Using secondary color from constants for better contrast
  },
  roleButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  roleIconContainer: {
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
  },
  roleTextContainer: {
    flex: 1,
    justifyContent: 'center', // Center the role title vertically
  },
  roleTitle: {
    fontSize: 20, // Slightly increased font size
    fontWeight: '600',
    color: COLORS.primary,
  },
    // Test button styles
  
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.secondary, // Using secondary color from constants
    fontSize: 12,
    fontWeight: '400',
  },
});

export default RoleSelectScreen;