// src/screens/chips/ChipsHome.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ScrollView, 
  RefreshControl,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { getChipsActiveRide } from '../../services/api';

const ChipsHome: React.FC = () => {
  const [activeRide, setActiveRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const fetchActiveRide = async () => {
    try {
      if (user?.id) {
        const ride = await getChipsActiveRide(user.id);
        setActiveRide(ride);
      }
    } catch (error) {
      console.error('Error fetching active ride:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActiveRide();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveRide();
  };

  const handleRequestRide = () => {
    navigation.navigate('RequestRide');
  };

  const handleViewActiveRide = () => {
    if (activeRide?.id) {
      navigation.navigate('ActiveRide', { rideId: activeRide.id });
    }
  };

  const handleViewHistory = () => {
    navigation.navigate('ChipsHistory');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => {}}>
            <FontAwesome5 name="home" size={24} color={COLORS.primary} solid />
            <Text style={[styles.tabLabel, styles.activeTabLabel]}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => Alert.alert('Loading', 'Still loading your data...')}
          >
            <FontAwesome5 name="ambulance" size={24} color={COLORS.gray} />
            <Text style={styles.tabLabel}>Active Ride</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.tabItem} onPress={handleViewHistory}>
            <FontAwesome5 name="history" size={24} color={COLORS.gray} />
            <Text style={styles.tabLabel}>Activity</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.tabItem} onPress={handleSettings}>
            <FontAwesome5 name="user" size={24} color={COLORS.gray} />
            <Text style={styles.tabLabel}>Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>UMMA-NA</Text>
          <Text style={styles.headerSubtitle}>Emergency Transport System</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome, {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.welcomeSubtext}>
            CHIPS Agent
          </Text>
        </View>
        
        {/* Always show the request button prominently */}
        <View style={[styles.actionCard, { marginBottom: activeRide ? 16 : 24 }]}>
          <TouchableOpacity 
            style={[
              styles.requestRideButton,
              activeRide && styles.secondaryRequestButton
            ]} 
            onPress={handleRequestRide}
            disabled={activeRide !== null}
          >
            <FontAwesome5 
              name="ambulance" 
              size={24} 
              color={activeRide ? COLORS.gray : COLORS.white} 
            />
            <Text style={[
              styles.requestRideButtonText,
              activeRide && styles.secondaryRequestText
            ]}>
              {activeRide 
                ? "Emergency Transport Already Requested" 
                : "Request Emergency Transport"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Show active ride card if there is one */}
        {activeRide && (
          <TouchableOpacity 
            style={styles.activeRideCard}
            onPress={handleViewActiveRide}
          >
            <View style={styles.activeRideHeader}>
              <FontAwesome5 name="ambulance" size={22} color={COLORS.white} />
              <Text style={styles.activeRideHeaderText}>Active Transport Request</Text>
            </View>
            <View style={styles.activeRideContent}>
              <Text style={styles.activeRideStatus}>
                Status: {activeRide.status ? activeRide.status.replace(/_/g, ' ') : 'Unknown'}
              </Text>
              <Text style={styles.activeRideType}>
                Type: {activeRide.complicationType ? activeRide.complicationType.replace(/_/g, ' ') : 'Unknown'}
              </Text>
              <Text style={styles.viewDetailsText}>Tap to view details →</Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => {}}
        >
          <FontAwesome5 name="home" size={24} color={COLORS.primary} solid />
          <Text style={[styles.tabLabel, styles.activeTabLabel]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => {
            if (activeRide?.id) {
              navigation.navigate('ActiveRide', { rideId: activeRide.id });
            } else {
              Alert.alert('No Active Ride', 'You don\'t have any active emergency transport requests.');
            }
          }}
        >
          <FontAwesome5 name="ambulance" size={24} color={COLORS.gray} />
          <Text style={styles.tabLabel}>Active Ride</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={handleViewHistory}
        >
          <FontAwesome5 name="history" size={24} color={COLORS.gray} />
          <Text style={styles.tabLabel}>Activity</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={handleSettings}
        >
          <FontAwesome5 name="user" size={24} color={COLORS.gray} />
          <Text style={styles.tabLabel}>Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: COLORS.secondary,
    fontSize: 12,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80, // Add padding to account for tab bar
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  actionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestRideButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryRequestButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  requestRideButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  secondaryRequestText: {
    color: COLORS.gray,
  },
  activeRideCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeRideHeader: {
    backgroundColor: COLORS.primary,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeRideHeaderText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  activeRideContent: {
    padding: 16,
  },
  activeRideStatus: {
    fontSize: 16,
    color: COLORS.dark,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  activeRideType: {
    fontSize: 16,
    color: COLORS.dark,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  viewDetailsText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  // Tab Bar Styles
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    height: 60,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    color: COLORS.gray,
  },
  activeTabLabel: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default ChipsHome;