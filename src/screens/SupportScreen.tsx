// src/screens/SupportScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';

const SupportScreen = () => {
  const handleEmailSupport = () => {
    const email = 'support@ummana.org';
    const subject = 'UMMA-NA Support Request';
    const body = 'Describe your issue here...';

    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open mail client.');
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Need Help?</Text>
      <Text style={styles.subtitle}>Our support team is here for you.</Text>

      <TouchableOpacity style={styles.button} onPress={handleEmailSupport}>
        <Text style={styles.buttonText}>Contact Support</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SupportScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 40,
    textAlign: 'center'
  },
  button: {
    backgroundColor: '#1E88E5',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '80%'
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center'
  }
});
