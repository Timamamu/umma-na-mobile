// src/components/CustomAlert.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Platform,
  Dimensions
} from 'react-native';
import { COLORS } from '../constants';

type ButtonType = {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: ButtonType[];
  onDismiss?: () => void;
}

// Create a global reference to control the alert from anywhere
export const AlertHelper = {
  alert: (
    title: string, 
    message?: string, 
    buttons?: ButtonType[]
  ) => {
    // This will be implemented when the component mounts
  },
  _alertRef: null as any,
  setAlertRef: (ref: any) => {
    AlertHelper._alertRef = ref;
  }
};

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', onPress: () => {}, style: 'default' }],
  onDismiss
}) => {
  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'destructive':
        return styles.destructiveButton;
      case 'cancel':
        return styles.cancelButton;
      default:
        return styles.defaultButton;
    }
  };

  const getButtonTextStyle = (style?: string) => {
    switch (style) {
      case 'destructive':
        return styles.destructiveButtonText;
      case 'cancel':
        return styles.cancelButtonText;
      default:
        return styles.defaultButtonText;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
          </View>
          
          {message ? (
            <View style={styles.messageContainer}>
              <Text style={styles.message}>{message}</Text>
            </View>
          ) : null}
          
          <View style={[
            styles.buttonContainer,
            buttons.length > 2 ? styles.buttonContainerVertical : styles.buttonContainerHorizontal
          ]}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  getButtonStyle(button.style),
                  buttons.length > 2 ? styles.buttonVertical : styles.buttonHorizontal,
                  buttons.length === 2 && index === 0 ? styles.buttonLeft : {},
                  buttons.length === 2 && index === 1 ? styles.buttonRight : {}
                ]}
                onPress={() => {
                  button.onPress();
                  if (onDismiss) onDismiss();
                }}
              >
                <Text style={[styles.buttonText, getButtonTextStyle(button.style)]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// AlertProvider component to be used at the app root
export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    message?: string;
    buttons?: ButtonType[];
  }>({
    title: '',
    message: '',
    buttons: [{ text: 'OK', onPress: () => {}, style: 'default' }]
  });

  useEffect(() => {
    // Implement the alert function
    AlertHelper.alert = (title, message, buttons) => {
      setConfig({ title, message, buttons });
      setVisible(true);
    };
    
    // Set the reference
    AlertHelper.setAlertRef({ show: () => setVisible(true), hide: () => setVisible(false) });
    
    return () => {
      AlertHelper._alertRef = null;
    };
  }, []);

  return (
    <>
      {children}
      <CustomAlert
        visible={visible}
        title={config.title}
        message={config.message}
        buttons={config.buttons}
        onDismiss={() => setVisible(false)}
      />
    </>
  );
};

// Function to replace React Native's Alert.alert
export const showAlert = (
  title: string,
  message?: string,
  buttons?: ButtonType[]
) => {
  AlertHelper.alert(title, message, buttons);
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    width: Math.min(300, Dimensions.get('window').width * 0.8),
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  titleContainer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    textAlign: 'center',
  },
  messageContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  message: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  buttonContainerHorizontal: {
    flexDirection: 'row',
  },
  buttonContainerVertical: {
    flexDirection: 'column',
  },
  button: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonHorizontal: {
    flex: 1,
  },
  buttonVertical: {
    width: '100%',
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  buttonLeft: {
    borderRightWidth: 0.5,
    borderRightColor: '#E0E0E0',
  },
  buttonRight: {
    borderLeftWidth: 0.5,
    borderLeftColor: '#E0E0E0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  defaultButton: {},
  cancelButton: {},
  destructiveButton: {},
  defaultButtonText: {
    color: COLORS.primary,
  },
  cancelButtonText: {
    color: COLORS.primary,
    fontWeight: '400',
  },
  destructiveButtonText: {
    color: COLORS.danger,
  },
});

export default CustomAlert;