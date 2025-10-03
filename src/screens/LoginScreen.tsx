// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { PHONE_REGEX, COLORS } from '../constants';
import { FontAwesome5 } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define your navigation types
type RootStackParamList = {
  RoleSelect: undefined;
  Login: { role: 'chips' | 'driver' };
};
type LoginScreenRouteProp = RouteProp<RootStackParamList, 'Login'>;
type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const route = useRoute<LoginScreenRouteProp>();
  const { role } = route.params;

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Missing Username', 'Please enter your username.');
      return;
    }
    if (!PHONE_REGEX.test(phoneNumber)) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid Nigerian phone number.');
      return;
    }

    try {
      setLoading(true);
      await login(phoneNumber, username, role);
      
      // After login, navigate based on role
      if (role === 'chips') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ChipsHome' as any }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'DriverHome' as any }],
        });
      }
    } catch (error) {
      console.error('Login failed', error);
      Alert.alert('Login Failed', 'Unable to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    navigation.goBack();
  };

  // Get the right icon based on role
  const getRoleIcon = () => {
    if (role === 'chips') {
      return <FontAwesome5 name="user-nurse" size={60} color={COLORS.secondary} />;
    } else {
      return <FontAwesome5 name="car" size={60} color={COLORS.secondary} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <FontAwesome5 name="arrow-left" size={20} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              {getRoleIcon()}
            </View>

            <Text style={styles.title}>
              Login as {role === 'chips' ? 'CHIPS Agent' : 'Driver'}
            </Text>

            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <FontAwesome5 name="user" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter Username (e.g., fatima_mamu)"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputWrapper}>
                <FontAwesome5 name="phone" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter Phone Number"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>

              <TouchableOpacity 
                style={styles.button} 
                onPress={handleLogin} 
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  backButton: {
    padding: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    width: '90%',
    height: 50,
    borderRadius: 8,
    marginBottom: 20,
  },
  inputIcon: {
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  button: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  }
});

export default LoginScreen;