// src/screens/driver/DriverHome.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
  Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { updateDriverAvailability, getDriverActiveRide } from '../../services/api';
import LocationService from '../../services/LocationService';
import * as Location from 'expo-location';

const DriverHome: React.FC = () => {
  const [activeRide, setActiveRide] = useState<any>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState<{
    tracking: boolean;
    lastUpdate: string;
    permissions: {
      foreground: string;
      background: string;
    };
  }>({
    tracking: false,
    lastUpdate: 'Never',
    permissions: {
      foreground: 'undetermined',
      background: 'undetermined'
    }
  });
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user data and active ride on component mount
  const fetchData = async () => {
    try {
      if (user?.id) {
        setIsAvailable(user.isAvailable ?? false);
        const ride = await getDriverActiveRide(user.id);
        setActiveRide(ride);
        
        // Check location service status
        await checkLocationServiceStatus();
      }
    } catch (error) {
      console.error('Error fetching driver data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Check location service status
  const checkLocationServiceStatus = async () => {
    try {
      // Check if tracking is active
      const isTracking = LocationService.isTrackingActive();
      
      // Get permissions status
      const permissionStatus = await LocationService.getPermissionStatus();
      
      // Get last update time
      const lastUpdateTime = LocationService.getLastUpdateTime();
      const formattedTime = lastUpdateTime > 0 
        ? formatLastUpdateTime(lastUpdateTime)
        : 'Never';
      
      setLocationStatus({
        tracking: isTracking,
        lastUpdate: formattedTime,
        permissions: {
          foreground: permissionStatus.foreground,
          background: permissionStatus.background
        }
      });
      
      // If user is available but tracking is not active, try to start it
      if (user?.isAvailable && !isTracking && user.id) {
        await LocationService.toggleDriverAvailability(user.id, true);
        
        // Check status again after attempting to start
        const trackingNow = LocationService.isTrackingActive();
        setLocationStatus(prev => ({
          ...prev,
          tracking: trackingNow
        }));
      }
    } catch (error) {
      console.error('Error checking location service status:', error);
    }
  };
  
  // Format last update time in a human-readable format
  const formatLastUpdateTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    // If less than a minute
    if (diff < 60 * 1000) {
      return 'Just now';
    }
    
    // If less than an hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    // If less than a day
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    
    // Otherwise show date
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Set up status updates every minute
  useEffect(() => {
    // Initial fetch
    fetchData();
    
    // Set up interval for status updates
    const intervalId = setInterval(() => {
      if (locationStatus.tracking) {
        const lastUpdateTime = LocationService.getLastUpdateTime();
        const formattedTime = lastUpdateTime > 0 
          ? formatLastUpdateTime(lastUpdateTime)
          : 'Never';
        
        setLocationStatus(prev => ({
          ...prev,
          lastUpdate: formattedTime
        }));
      }
    }, 60000); // Every minute
    
    updateIntervalRef.current = intervalId;
    
    // Cleanup on unmount
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [user]);

  // Request a manual location update
  const handleRequestLocationUpdate = async () => {
    if (!user?.id) return;
    
    try {
      setIsUpdatingLocation(true);
      const success = await LocationService.requestImmediateUpdate(user.id);
      
      if (success) {
        // Update the location status
        const lastUpdateTime = LocationService.getLastUpdateTime();
        const formattedTime = lastUpdateTime > 0 
          ? formatLastUpdateTime(lastUpdateTime)
          : 'Never';
        
        setLocationStatus(prev => ({
          ...prev,
          lastUpdate: formattedTime
        }));
        
        Alert.alert('Success', 'Location updated successfully');
      } else {
        Alert.alert('Update Failed', 'Could not update location. Please check your GPS settings and try again.');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      Alert.alert('Error', 'An error occurred while updating location.');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  // Request location permissions
  const handleRequestPermissions = async () => {
    try {
      const granted = await LocationService.requestPermissions();
      
      if (granted) {
        Alert.alert('Success', 'Location permissions granted');
        // Update status
        await checkLocationServiceStatus();
      } else {
        Alert.alert(
          'Permission Required',
          'Location permission is required to respond to emergency requests. Please enable location in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings',
              onPress: () => {
                // Open device settings if on iOS
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  // On Android, direct to app settings
                  Linking.openSettings();
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAvailabilityToggle = async (value: boolean) => {
    if (!user) return;
    
    try {
      // Update local state immediately for better UX
      setIsAvailable(value);
      
      // Start or adjust location tracking based on availability
      await LocationService.toggleDriverAvailability(user.id, value);
      
      // Update server state
      await updateDriverAvailability(user.id, value);
      
      // Update location status
      await checkLocationServiceStatus();
    } catch (error) {
      console.error('Error updating availability', error);
      Alert.alert('Error', 'Could not update availability status.');
      
      // Revert switch if update fails
      setIsAvailable(!value);
    }
  };

  const handleViewPendingRequests = () => {
    navigation.navigate('DriverPendingRequests');
  };

  const handleViewActiveRide = () => {
    if (activeRide?.id) {
      navigation.navigate('DriverActiveRide', { rideId: activeRide.id });
    }
  };

  const handleViewHistory = () => {
    navigation.navigate('DriverRideHistory');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  // Render location permission status
  const renderLocationPermissionStatus = () => {
    const { foreground, background } = locationStatus.permissions;
    
    if (foreground !== 'granted') {
      return (
        <View style={styles.permissionCard}>
          <FontAwesome5 name="exclamation-triangle" size={20} color={COLORS.warning} />
          <View style={styles.permissionTextContainer}>
            <Text style={styles.permissionTitle}>Location Permission Required</Text>
            <Text style={styles.permissionDescription}>
              You need to grant location permission to respond to emergency transport requests.
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={handleRequestPermissions}
          >
            <Text style={styles.permissionButtonText}>Grant</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (Platform.OS === 'ios' && background !== 'granted') {
      return (
        <View style={styles.permissionCard}>
          <FontAwesome5 name="info-circle" size={20} color={COLORS.accent} />
          <View style={styles.permissionTextContainer}>
            <Text style={styles.permissionTitle}>Background Location Recommended</Text>
            <Text style={styles.permissionDescription}>
              For optimal emergency response, please enable "Always" location access in settings.
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={handleRequestPermissions}
          >
            <Text style={styles.permissionButtonText}>Enable</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return null;
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
            ETS Driver
          </Text>
        </View>
        
        {/* Location Permission Status */}
        {renderLocationPermissionStatus()}
        
        {/* Availability Toggle Card */}
        <View style={styles.availabilityCard}>
          <View style={styles.availabilityContent}>
            <View style={styles.availabilityTextContainer}>
              <Text style={styles.availabilityTitle}>Driver Availability</Text>
              <Text style={styles.availabilityDescription}>
                {isAvailable 
                  ? "You are available to receive emergency transport requests" 
                  : "You are not receiving any emergency transport requests"}
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={handleAvailabilityToggle}
              trackColor={{ false: '#E0E0E0', true: COLORS.accent }}
              thumbColor={isAvailable ? COLORS.secondary : '#FFFFFF'}
              ios_backgroundColor="#E0E0E0"
            />
          </View>
        </View>
        
        {/* Location Status Card */}
        <View style={styles.locationCard}>
          <View style={styles.locationCardHeader}>
            <FontAwesome5 name="map-marker-alt" size={18} color={COLORS.primary} />
            <Text style={styles.locationCardTitle}>Location Status</Text>
          </View>
          
          <View style={styles.locationStatusItem}>
            <Text style={styles.locationStatusLabel}>Tracking:</Text>
            <View style={styles.statusIndicatorContainer}>
              <View style={[
                styles.statusIndicator, 
                locationStatus.tracking ? styles.statusActive : styles.statusInactive
              ]} />
              <Text style={styles.locationStatusValue}>
                {locationStatus.tracking ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          
          <View style={styles.locationStatusItem}>
            <Text style={styles.locationStatusLabel}>Last Update:</Text>
            <Text style={styles.locationStatusValue}>
              {locationStatus.lastUpdate}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.updateLocationButton}
            onPress={handleRequestLocationUpdate}
            disabled={isUpdatingLocation}
          >
            {isUpdatingLocation ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <FontAwesome5 name="sync" size={16} color={COLORS.white} />
                <Text style={styles.updateLocationButtonText}>Update Location Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Active Ride Card (if there is one) */}
        {activeRide && (
          <TouchableOpacity 
            style={styles.activeRideCard}
            onPress={handleViewActiveRide}
          >
            <View style={styles.activeRideHeader}>
              <FontAwesome5 name="ambulance" size={22} color={COLORS.white} />
              <Text style={styles.activeRideHeaderText}>Active Transport Assignment</Text>
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
        
        {/* Pending Requests Button */}
        {isAvailable && !activeRide && locationStatus.tracking && (
          <TouchableOpacity 
            style={styles.pendingRequestsButton} 
            onPress={handleViewPendingRequests}
          >
            <FontAwesome5 name="list-alt" size={20} color={COLORS.white} />
            <Text style={styles.pendingRequestsText}>View Pending Ride Requests</Text>
          </TouchableOpacity>
        )}
        
        {/* Status Message when not available */}
        {!isAvailable && !activeRide && (
          <View style={styles.statusCard}>
            <FontAwesome5 name="info-circle" size={24} color={COLORS.gray} style={styles.statusIcon} />
            <Text style={styles.statusText}>
              You are currently set as unavailable. Toggle your availability above to receive emergency transport requests.
            </Text>
          </View>
        )}
        
        {/* Location tracking not active warning */}
        {isAvailable && !locationStatus.tracking && (
          <View style={styles.warningCard}>
            <FontAwesome5 name="exclamation-triangle" size={24} color={COLORS.warning} style={styles.statusIcon} />
            <Text style={styles.warningText}>
              Location tracking is not active. You need active location tracking to receive emergency requests. Try updating your location or check app permissions.
            </Text>
          </View>
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
              navigation.navigate('DriverActiveRide', { rideId: activeRide.id });
            } else {
              Alert.alert('No Active Ride', 'You don\'t have any active transport assignments.');
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
  availabilityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  availabilityContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  availabilityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 6,
  },
  availabilityDescription: {
    fontSize: 14,
    color: COLORS.gray,
  },
  // Location Card Styles
  locationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginLeft: 8,
  },
  locationStatusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationStatusLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  locationStatusValue: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: '500',
  },
  statusIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusActive: {
    backgroundColor: '#4CAF50', // Green
  },
  statusInactive: {
    backgroundColor: '#F44336', // Red
  },
  updateLocationButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  updateLocationButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  // Permission Card Styles
  permissionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionTextContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: COLORS.gray,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  permissionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  activeRideCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
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
  pendingRequestsButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  pendingRequestsText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warningCard: {
    backgroundColor: '#FFF3E0', // Light orange background
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  statusIcon: {
    marginRight: 16,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.dark,
    flex: 1,
  },
  warningText: {
    fontSize: 14,
    color: '#E65100', // Dark orange text
    flex: 1,
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

export default DriverHome;