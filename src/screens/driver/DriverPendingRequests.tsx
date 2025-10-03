// src/screens/driver/DriverPendingRequests.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Vibration,
  Platform,
  Linking
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, RIDE_STATUS } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { getDriverPendingRequests, updateRideStatus } from '../../services/api';
import LocationService from '../../services/LocationService';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av'; // Import Audio from expo-av

// Define emergency level types for severity indication
type EmergencyLevel = 'critical' | 'high' | 'medium' | 'low';

// Get color for emergency level
const getEmergencyColor = (level: EmergencyLevel): string => {
  switch (level) {
    case 'critical':
      return '#D32F2F'; // Deep red
    case 'high':
      return '#F57C00'; // Orange
    case 'medium':
      return '#FFC107'; // Amber
    case 'low':
      return '#4CAF50'; // Green
    default:
      return COLORS.primary;
  }
};

// Get description for emergency level
const getEmergencyDescription = (level: EmergencyLevel): string => {
  switch (level) {
    case 'critical':
      return 'Requires immediate response';
    case 'high':
      return 'Urgent medical transport needed';
    case 'medium':
      return 'Prompt transport required';
    case 'low':
      return 'Standard transport';
    default:
      return 'Transport needed';
  }
};

// Define the patterns for vibration based on emergency level
const getVibrationPattern = (level: EmergencyLevel): number[] => {
  switch (level) {
    case 'critical':
      return [0, 500, 200, 500, 200, 500]; // Three long pulses
    case 'high':
      return [0, 300, 150, 300]; // Two medium pulses
    case 'medium':
      return [0, 250, 250]; // One medium pulse
    case 'low':
    default:
      return [0, 100]; // Short pulse
  }
};

interface PendingRequest {
  id: string;
  complicationType: string;
  conditionName?: string;
  severity?: EmergencyLevel;
  createdAt: any;
  pickupLocation: {
    lat: number;
    lng: number;
  };
  hospitalAssigned?: {
    name: string;
    location: {
      lat: number;
      lng: number;
    };
    totalTripTime?: number;
  };
  chipsAgentId: string;
  chipsAgentDetails?: {
    name: string;
    phoneNumber: string;
  };
  driverAssigned?: {
    id: string;
    name: string;
    phoneNumber: string;
    vehicleType: string;
    distanceToChips: number;
    estimatedPickupTimeMin: number;
  };
}

const DriverPendingRequests: React.FC = () => {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState({
    tracking: false,
    lastUpdate: 0,
  });
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const previousRequestCount = useRef<number>(0);
  const notificationSound = useRef<Audio.Sound | null>(null);
  
  const checkLocationStatus = useCallback(async () => {
    const isTracking = LocationService.isTrackingActive();
    const lastUpdateTime = LocationService.getLastUpdateTime();
    
    setLocationStatus({
      tracking: isTracking,
      lastUpdate: lastUpdateTime,
    });
    
    // If tracking is not active but user is available, try to start it
    if (!isTracking && user?.isAvailable && user.id) {
      try {
        await LocationService.toggleDriverAvailability(user.id, true);
      } catch (error) {
        console.error('Failed to start location tracking:', error);
      }
    }
  }, [user]);

  const fetchPendingRequests = useCallback(async () => {
    try {
      setLoading(true);
      if (user?.id) {
        console.log('Fetching pending requests for driver:', user.id);
        const requests = await getDriverPendingRequests(user.id);
        console.log(`Found ${requests.length} pending requests`);
        
        // Check if new requests have arrived
        if (requests.length > previousRequestCount.current && previousRequestCount.current > 0) {
          // New requests have arrived, alert the driver
          const newRequestsCount = requests.length - previousRequestCount.current;
          
          // Find the most critical emergency level among new requests
          let highestSeverity: EmergencyLevel = 'low';
          requests.slice(0, newRequestsCount).forEach((request: PendingRequest) => {
            if (request.severity === 'critical') highestSeverity = 'critical';
            else if (request.severity === 'high' && highestSeverity !== 'critical') highestSeverity = 'high';
            else if (request.severity === 'medium' && highestSeverity !== 'critical' && highestSeverity !== 'high') highestSeverity = 'medium';
          });
          
          // Vibrate based on emergency level
          if (Platform.OS !== 'web') {
            Vibration.vibrate(getVibrationPattern(highestSeverity));
          }
          
          // Play notification sound based on severity
          playNotificationSound(highestSeverity);
          
          // Show notification
          Notifications.scheduleNotificationAsync({
            content: {
              title: `${newRequestsCount} New Emergency Request${newRequestsCount > 1 ? 's' : ''}`,
              body: `${newRequestsCount} new ${highestSeverity} priority transport request${newRequestsCount > 1 ? 's' : ''} available`,
              data: { screen: 'DriverPendingRequests' },
            },
            trigger: null, // Show immediately
          });
        }
        
        // Update request count for next comparison
        previousRequestCount.current = requests.length;
        
        // Add severity if not already present
        const processedRequests = requests.map((request: PendingRequest) => {
          if (!request.severity) {
            // Default severity mapping based on complicationType
            let severity: EmergencyLevel = 'medium';
            
            // Map common emergency types to severity levels
            switch (request.complicationType) {
              case 'PPH':
              case 'eclampsia':
              case 'sepsis':
              case 'unknown':
                severity = 'critical';
                break;
              case 'obstructed_labor':
              case 'preterm_labor':
              case 'miscarriage':
                severity = 'high';
                break;
              case 'normal_delivery':
                severity = 'medium';
                break;
              default:
                severity = 'medium';
            }
            
            return {
              ...request,
              severity
            };
          }
          return request;
        });
        
        setPendingRequests(processedRequests);
        
        // If the screen is coming into focus, update location
        if (!refreshing && user.id && user.isAvailable) {
          await LocationService.requestImmediateUpdate(user.id);
          checkLocationStatus();
        }
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      Alert.alert('Error', 'Could not load pending requests. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, refreshing, checkLocationStatus]);

  // Play notification sound based on emergency level
  const playNotificationSound = async (level: EmergencyLevel) => {
    try {
      // Unload any existing sound
      if (notificationSound.current) {
        await notificationSound.current.unloadAsync();
        notificationSound.current = null;
      }

      // Load the appropriate sound based on severity level
      let soundSource;
      switch (level) {
        case 'critical':
          // You'll need to add these sound files to your assets folder
          soundSource = require('../../../assets/sounds/critical-alert.mp3');
          break;
        case 'high':
          soundSource = require('../../../assets/sounds/high-alert.mp3');
          break;
        case 'medium':
          soundSource = require('../../../assets/sounds/medium-alert.mp3');
          break;
        case 'low':
        default:
          soundSource = require('../../../assets/sounds/standard-alert.mp3');
          break;
      }

      // Load and play the sound
      const { sound } = await Audio.Sound.createAsync(soundSource, {
        shouldPlay: true,
        volume: 1.0
      });
      
      notificationSound.current = sound;
      
      // Cleanup sound after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          // Unload the sound when finished
          sound.unloadAsync();
          if (notificationSound.current === sound) {
            notificationSound.current = null;
          }
        }
      });
      
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  // Initial data fetch on mount
  useEffect(() => {
    // Set up Audio mode
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        });
      } catch (error) {
        console.error('Error setting up audio mode:', error);
      }
    };
    
    setupAudio();
    fetchPendingRequests();
    checkLocationStatus();
    
    // Set up polling interval (every 30 seconds)
    const intervalId = setInterval(() => {
      if (user?.isAvailable) {
        fetchPendingRequests();
      }
    }, 30000);
    
    // Clean up interval on unmount
    return () => {
      clearInterval(intervalId);
      
      // Clean up audio resources
      if (notificationSound.current) {
        notificationSound.current.unloadAsync().catch(error => 
          console.error('Error unloading sound:', error)
        );
      }
    };
  }, [fetchPendingRequests, checkLocationStatus, user]);

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchPendingRequests();
      checkLocationStatus();
      
      return () => {
        // Clean up if needed when screen loses focus
      };
    }, [fetchPendingRequests, checkLocationStatus])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingRequests();
    checkLocationStatus();
  };

  const handleHomePress = () => {
    navigation.navigate('DriverHome');
  };

  const handleActiveRide = () => {
    navigation.navigate('DriverActiveRide');
  };

  const handleActivityPress = () => {
    navigation.navigate('DriverRideHistory');
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  const formatDistanceTime = (distance: number, timeMin: number) => {
    const distanceKm = Math.round(distance * 10) / 10;
    const timeMinutes = Math.round(timeMin);
    
    return `${distanceKm} km (about ${timeMinutes} min)`;
  };

  const formatEmergencyType = (type: string, name?: string) => {
    // Use condition name if available, otherwise format the type
    if (name) return name;
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateValue: any) => {
    try {
      // Check if date is null or undefined
      if (!dateValue) {
        return 'Just now';
      }
      
      // Handle ISO string
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        // Check if date is valid
        if (!isNaN(date.getTime())) {
          // If within the last hour, show minutes ago
          const minutesAgo = Math.floor((Date.now() - date.getTime()) / 60000);
          if (minutesAgo < 60) {
            return `${minutesAgo} min ago`;
          }
          
          // If within the same day, show hours ago
          const hoursAgo = Math.floor(minutesAgo / 60);
          if (hoursAgo < 24) {
            return `${hoursAgo} ${hoursAgo === 1 ? 'hour' : 'hours'} ago`;
          }
          
          // Otherwise show the date
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      
      // Handle Firebase server timestamp (object with seconds and nanoseconds)
      if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue) {
        const date = new Date(dateValue.seconds * 1000);
        const minutesAgo = Math.floor((Date.now() - date.getTime()) / 60000);
        
        if (minutesAgo < 60) {
          return `${minutesAgo} min ago`;
        }
        
        const hoursAgo = Math.floor(minutesAgo / 60);
        if (hoursAgo < 24) {
          return `${hoursAgo} ${hoursAgo === 1 ? 'hour' : 'hours'} ago`;
        }
        
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // If we get here, just return a generic time
      return 'Recently';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Recent';
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    // First check if location is current enough
    const now = Date.now();
    const locationAge = now - locationStatus.lastUpdate;
    const MAX_LOCATION_AGE = 5 * 60 * 1000; // 5 minutes
    
    if (locationAge > MAX_LOCATION_AGE || !locationStatus.tracking) {
      // Location is too old or tracking is off, prompt for update
      Alert.alert(
        'Location Update Needed',
        'Your location information is outdated or tracking is inactive. Would you like to update your location before accepting this request?',
        [
          { 
            text: 'Update Location', 
            onPress: async () => {
              if (user?.id) {
                try {
                  const updated = await LocationService.requestImmediateUpdate(user.id);
                  if (updated) {
                    checkLocationStatus();
                    // Continue with accept after location update
                    showAcceptConfirmation(requestId);
                  } else {
                    Alert.alert('Error', 'Could not update location. Please check your GPS settings or try again later.');
                  }
                } catch (error) {
                  console.error('Error updating location:', error);
                  Alert.alert('Error', 'Could not update location. Please try again.');
                }
              }
            } 
          },
          { 
            text: 'Continue Anyway', 
            style: 'destructive',
            onPress: () => showAcceptConfirmation(requestId)
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } else {
      // Location is current, continue with normal flow
      showAcceptConfirmation(requestId);
    }
  };
  
  const showAcceptConfirmation = (requestId: string) => {
    // Find the request to show appropriate information
    const request = pendingRequests.find(req => req.id === requestId);
    
    if (!request) {
      Alert.alert('Error', 'Request information not found.');
      return;
    }
    
    // Get emergency level information for messaging
    const severity = request.severity || 'medium';
    
    Alert.alert(
      `Accept ${severity.toUpperCase()} Priority Transport`,
      `This is a ${severity} priority request for ${formatEmergencyType(request.complicationType, request.conditionName)}. ${getEmergencyDescription(severity)}. Are you sure you want to accept this emergency transport request?`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel'
        },
        {
          text: 'Accept Emergency',
          style: 'default',
          onPress: async () => {
            try {
              setAcceptingId(requestId);
              // Update the ride status to accepted
              await updateRideStatus(requestId, RIDE_STATUS.ACCEPTED);
              
              // Navigate to the active ride screen
              navigation.replace('DriverActiveRide', { rideId: requestId });
            } catch (error) {
              console.error('Error accepting request:', error);
              Alert.alert('Error', 'Could not accept this request. Please try again.');
              setAcceptingId(null);
            }
          }
        }
      ]
    );
  };

  const renderRequestItem = ({ item }: { item: PendingRequest }) => {
    const isAccepting = acceptingId === item.id;
    const emergencyColor = getEmergencyColor(item.severity || 'medium');
    
    return (
      <View style={[
        styles.requestCard,
        // Subtle border color based on emergency level
        { borderLeftWidth: 4, borderLeftColor: emergencyColor }
      ]}>
        <View style={styles.requestHeader}>
          <View style={[
            styles.emergencyBadge,
            { backgroundColor: emergencyColor }
          ]}>
            <FontAwesome5 name="heartbeat" size={12} color={COLORS.white} />
            <Text style={styles.emergencyText}>
              {formatEmergencyType(item.complicationType, item.conditionName)}
            </Text>
          </View>
          <Text style={styles.timeText}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Emergency Level Indicator */}
        <View style={styles.emergencyLevelContainer}>
          <Text style={styles.emergencyLevelLabel}>
            Priority: <Text style={{ color: emergencyColor, fontWeight: 'bold' }}>
              {(item.severity || 'medium').toUpperCase()}
            </Text>
          </Text>
          <Text style={styles.emergencyDescription}>
            {getEmergencyDescription(item.severity || 'medium')}
          </Text>
        </View>

        <View style={styles.requestDetails}>
          {/* Distance Section */}
          <View style={styles.detailRow}>
            <FontAwesome5 name="map-marker-alt" size={16} color={COLORS.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Distance to Patient</Text>
              <Text style={styles.detailText}>
                {item.driverAssigned?.distanceToChips 
                  ? formatDistanceTime(
                      item.driverAssigned.distanceToChips,
                      item.driverAssigned.estimatedPickupTimeMin
                    )
                  : 'Unknown distance'}
              </Text>
            </View>
          </View>
          
          {/* Hospital Section */}
          <View style={styles.detailRow}>
            <FontAwesome5 name="hospital" size={16} color={COLORS.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Destination</Text>
              <Text style={styles.detailText}>
                {item.hospitalAssigned?.name || 'Hospital to be determined'}
              </Text>
              {item.hospitalAssigned?.totalTripTime && (
                <Text style={styles.tripTimeText}>
                  Est. total trip: {Math.round(item.hospitalAssigned.totalTripTime)} minutes
                </Text>
              )}
            </View>
          </View>
          
          {/* CHIPS Agent Details */}
          {item.chipsAgentDetails && (
            <View style={styles.detailRow}>
              <FontAwesome5 name="user-md" size={16} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>CHIPS Agent</Text>
                <Text style={styles.detailText}>{item.chipsAgentDetails.name}</Text>
                <TouchableOpacity 
                  onPress={() => {
                    const phoneNumber = item.chipsAgentDetails?.phoneNumber;
                    if (phoneNumber) {
                      const phoneUrl = `tel:${phoneNumber}`;
                      Linking.canOpenURL(phoneUrl)
                        .then((supported: boolean) => {
                          if (supported) {
                            return Linking.openURL(phoneUrl);
                          }
                        })
                        .catch((error: Error) => console.error('Could not open phone app:', error));
                    }
                  }}
                  style={styles.phoneButton}
                >
                  <FontAwesome5 name="phone" size={12} color={COLORS.primary} />
                  <Text style={styles.phoneButtonText}>
                    {item.chipsAgentDetails.phoneNumber}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={[
            styles.acceptButton,
            { backgroundColor: isAccepting ? COLORS.gray : emergencyColor },
            isAccepting && styles.acceptingButton
          ]}
          onPress={() => handleAcceptRequest(item.id)}
          disabled={isAccepting}
        >
          {isAccepting ? (
            <>
              <ActivityIndicator size="small" color={COLORS.white} />
              <Text style={styles.buttonText}>Accepting...</Text>
            </>
          ) : (
            <>
              <FontAwesome5 name="check" size={16} color={COLORS.white} />
              <Text style={styles.buttonText}>Accept Request</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      {/* Replace Image with FontAwesome5 icon */}
      <FontAwesome5 name="inbox" size={50} color={COLORS.gray} />
      <Text style={styles.emptyTitle}>No Pending Requests</Text>
      <Text style={styles.emptyText}>
        There are no emergency transport requests at this time. Please check back later.
      </Text>
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={fetchPendingRequests}
      >
        <FontAwesome5 name="sync" size={16} color={COLORS.white} />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLocationWarning = () => {
    if (!locationStatus.tracking || (Date.now() - locationStatus.lastUpdate > 10 * 60 * 1000)) {
      return (
        <TouchableOpacity 
          style={styles.locationWarning}
          onPress={async () => {
            if (user?.id) {
              try {
                setLoading(true);
                await LocationService.requestImmediateUpdate(user.id);
                await checkLocationStatus();
              } catch (error) {
                console.error('Error updating location:', error);
              } finally {
                setLoading(false);
              }
            }
          }}
        >
          <FontAwesome5 name="exclamation-triangle" size={16} color="#FFF" />
          <Text style={styles.locationWarningText}>
            {!locationStatus.tracking 
              ? 'Location tracking inactive. Tap to update.' 
              : 'Location data is outdated. Tap to refresh.'}
          </Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Requests</Text>
        <View style={styles.headerRight} />
      </View>

      {renderLocationWarning()}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading emergency requests...</Text>
        </View>
      ) : (
        <FlatList
          data={pendingRequests}
          renderItem={renderRequestItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={handleHomePress}>
          <FontAwesome5 name="home" size={24} color={COLORS.gray} />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tabItem} onPress={handleActiveRide}>
          <FontAwesome5 name="ambulance" size={24} color={COLORS.gray} />
          <Text style={styles.tabLabel}>Active Ride</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tabItem} onPress={handleActivityPress}>
          <FontAwesome5 name="history" size={24} color={COLORS.gray} />
          <Text style={styles.tabLabel}>Activity</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tabItem} onPress={handleSettingsPress}>
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
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 36, // Balance layout
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.primary,
  },
  locationWarning: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  locationWarningText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Space for tab bar
  },
  requestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  emergencyText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  // Emergency level container
  emergencyLevelContainer: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emergencyLevelLabel: {
    fontSize: 14,
    color: COLORS.dark,
  },
  emergencyDescription: {
    fontSize: 14,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  requestDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailContent: {
    flex: 1,
    marginLeft: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 2,
  },
  detailText: {
    fontSize: 16,
    color: COLORS.dark,
    fontWeight: '500',
  },
  tripTimeText: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 2,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  phoneButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 6,
    textDecorationLine: 'underline',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
  },
  acceptingButton: {
    backgroundColor: COLORS.gray,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 10,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  refreshButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 8,
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

export default DriverPendingRequests;