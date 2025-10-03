// src/screens/driver/DriverActiveRide.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator, 
  SafeAreaView,
  Alert,
  Linking
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, RIDE_STATUS, STATUS_DISPLAY } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { getDriverActiveRide, updateRideStatus } from '../../services/api';

// Define the route params type
type RouteParams = {
  DriverActiveRide: {
    rideId?: string;
  }
};

const DriverActiveRide: React.FC = () => {
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const route = useRoute<RouteProp<RouteParams, 'DriverActiveRide'>>();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { rideId } = route.params || {};

  const fetchRideDetails = async () => {
    try {
      setLoading(true);
      let rideData;
      
      // If rideId was passed, use that specific ID
      if (rideId) {
        // Get active ride and check if it matches the requested ID
        rideData = await getDriverActiveRide(user?.id || '');
        
        // Verify this is the ride we want
        if (rideData && rideData.id !== rideId) {
          Alert.alert('Ride Not Found', 'The requested ride could not be found.');
          navigation.goBack();
          return;
        }
      } else {
        // Otherwise get whatever active ride exists
        rideData = await getDriverActiveRide(user?.id || '');
      }
      
      // If no ride was found at all
      if (!rideData) {
        Alert.alert('No Active Ride', 'You don\'t have any active transport assignments.');
        navigation.replace('DriverHome');
        return;
      }
      
      setRide(rideData);
    } catch (error) {
      console.error('Error fetching ride details:', error);
      Alert.alert('Error', 'Could not load ride details. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRideDetails();
  }, [user, rideId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRideDetails();
  };

  const handleCallChipsAgent = () => {
    if (ride?.chipsAgentDetails?.phoneNumber) {
      const phoneNumber = `tel:${ride.chipsAgentDetails.phoneNumber}`;
      Linking.canOpenURL(phoneNumber)
        .then((supported) => {
          if (supported) {
            return Linking.openURL(phoneNumber);
          } else {
            Alert.alert('Phone Not Supported', 'Your device cannot make phone calls.');
          }
        })
        .catch((error) => {
          console.error('Error opening phone dialer:', error);
          Alert.alert('Error', 'Could not open phone dialer.');
        });
    } else {
      Alert.alert('No Phone Number', 'CHIPS agent phone number is not available.');
    }
  };

  const handleUpdateStatus = (newStatus: string) => {
    Alert.alert(
      'Update Status',
      `Are you sure you want to update the status to "${STATUS_DISPLAY[newStatus]}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              await updateRideStatus(ride.id, newStatus);
              await fetchRideDetails(); // Refresh to get updated status
              
              // If completed, navigate back to home
              if (newStatus === RIDE_STATUS.COMPLETED) {
                Alert.alert('Completed', 'This transport has been marked as completed.');
                navigation.replace('DriverHome');
              }
            } catch (error) {
              console.error('Error updating status:', error);
              Alert.alert('Error', 'Could not update status. Please try again.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleViewHistory = () => {
    navigation.navigate('DriverRideHistory');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case RIDE_STATUS.PENDING:
        return COLORS.warning;
      case RIDE_STATUS.ACCEPTED:
      case RIDE_STATUS.EN_ROUTE_TO_PICKUP:
      case RIDE_STATUS.ARRIVED_AT_PICKUP:
      case RIDE_STATUS.EN_ROUTE_TO_HOSPITAL:
        return COLORS.primary;
      case RIDE_STATUS.ARRIVED_AT_HOSPITAL:
      case RIDE_STATUS.COMPLETED:
        return COLORS.success;
      case RIDE_STATUS.CANCELLED:
        return COLORS.danger;
      default:
        return COLORS.gray;
    }
  };

  const getNextStatus = () => {
    switch (ride?.status) {
      case RIDE_STATUS.PENDING:
        return RIDE_STATUS.ACCEPTED;
      case RIDE_STATUS.ACCEPTED:
        return RIDE_STATUS.EN_ROUTE_TO_PICKUP;
      case RIDE_STATUS.EN_ROUTE_TO_PICKUP:
        return RIDE_STATUS.ARRIVED_AT_PICKUP;
      case RIDE_STATUS.ARRIVED_AT_PICKUP:
        return RIDE_STATUS.EN_ROUTE_TO_HOSPITAL;
      case RIDE_STATUS.EN_ROUTE_TO_HOSPITAL:
        return RIDE_STATUS.ARRIVED_AT_HOSPITAL;
      case RIDE_STATUS.ARRIVED_AT_HOSPITAL:
        return RIDE_STATUS.COMPLETED;
      default:
        return null;
    }
  };

  const renderStatusTimeline = () => {
    const statuses = [
      { key: RIDE_STATUS.PENDING, label: 'Request Received' },
      { key: RIDE_STATUS.ACCEPTED, label: 'Request Accepted' },
      { key: RIDE_STATUS.EN_ROUTE_TO_PICKUP, label: 'En Route to Patient' },
      { key: RIDE_STATUS.ARRIVED_AT_PICKUP, label: 'Arrived at Patient' },
      { key: RIDE_STATUS.EN_ROUTE_TO_HOSPITAL, label: 'En Route to Hospital' },
      { key: RIDE_STATUS.ARRIVED_AT_HOSPITAL, label: 'Arrived at Hospital' },
      { key: RIDE_STATUS.COMPLETED, label: 'Completed' }
    ];

    // Find the current status index
    const currentIndex = statuses.findIndex(s => s.key === ride.status);
    
    return (
      <View style={styles.timelineContainer}>
        {statuses.map((status, index) => {
          const isActive = index <= currentIndex && 
                           ride.status !== RIDE_STATUS.CANCELLED;
          const isLast = index === statuses.length - 1;
          
          return (
            <View key={status.key} style={styles.timelineItem}>
              <View style={styles.timelineStepRow}>
                <View style={[
                  styles.timelineCircle,
                  isActive ? styles.timelineCircleActive : styles.timelineCircleInactive
                ]}>
                  {isActive && <View style={styles.timelineCircleInner} />}
                </View>
                
                {!isLast && (
                  <View style={[
                    styles.timelineLine,
                    isActive && index < currentIndex 
                      ? styles.timelineLineActive 
                      : styles.timelineLineInactive
                  ]} />
                )}
              </View>
              
              <Text style={[
                styles.timelineLabel,
                isActive ? styles.timelineLabelActive : styles.timelineLabelInactive
              ]}>
                {status.label}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading ride details...</Text>
        </View>
        
        {/* Bottom Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('DriverHome')}>
            <FontAwesome5 name="home" size={24} color={COLORS.gray} />
            <Text style={styles.tabLabel}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.tabItem}>
            <FontAwesome5 name="ambulance" size={24} color={COLORS.primary} solid />
            <Text style={[styles.tabLabel, styles.activeTabLabel]}>Active Ride</Text>
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

  // Extract next status if available
  const nextStatus = getNextStatus();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Transport</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Status Badge */}
        <View style={styles.statusBadgeContainer}>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: getStatusColor(ride.status) }
          ]}>
            <Text style={styles.statusText}>
              {STATUS_DISPLAY[ride.status] || ride.status.replace(/_/g, ' ')}
            </Text>
          </View>
          
          <Text style={styles.rideId}>ID: {ride.id}</Text>
        </View>

        {/* Emergency Type */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="heartbeat" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Emergency Type</Text>
          </View>
          <Text style={styles.emergencyType}>
            {ride.complicationType ? ride.complicationType.replace(/_/g, ' ') : 'Unknown'}
          </Text>
        </View>

        {/* CHIPS Agent Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="user" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>CHIPS Agent</Text>
          </View>
          
          <View style={styles.agentInfo}>
            {ride.chipsAgentDetails?.name ? (
              <>
                <Text style={styles.agentName}>
                  {ride.chipsAgentDetails.name}
                </Text>
                
                <TouchableOpacity style={styles.callButton} onPress={handleCallChipsAgent}>
                  <FontAwesome5 name="phone" size={16} color={COLORS.white} />
                  <Text style={styles.callButtonText}>Call Agent</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.agentName}>Details not available</Text>
            )}
          </View>
        </View>

        {/* Patient Pickup Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="map-marker-alt" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Pickup Location</Text>
          </View>
          
          <View style={styles.locationInfo}>
            {ride.pickupLocation ? (
              <>
                <Text style={styles.locationText}>
                  Lat: {ride.pickupLocation.lat.toFixed(6)}
                </Text>
                <Text style={styles.locationText}>
                  Lng: {ride.pickupLocation.lng.toFixed(6)}
                </Text>
                <TouchableOpacity style={styles.mapButton}>
                  <FontAwesome5 name="directions" size={16} color={COLORS.white} />
                  <Text style={styles.mapButtonText}>Open in Maps</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.locationText}>Location not available</Text>
            )}
          </View>
        </View>

        {/* Hospital Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="hospital" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Hospital Details</Text>
          </View>
          
          <View style={styles.hospitalInfo}>
            <Text style={styles.hospitalName}>
              {ride.hospitalAssigned?.name || 'Not assigned yet'}
            </Text>
            
            {ride.hospitalAssigned?.totalTripTime && (
              <Text style={styles.tripTime}>
                Est. Total Trip: {Math.round(ride.hospitalAssigned.totalTripTime)} minutes
              </Text>
            )}

            {ride.hospitalAssigned?.location && (
              <TouchableOpacity style={styles.mapButton}>
                <FontAwesome5 name="directions" size={16} color={COLORS.white} />
                <Text style={styles.mapButtonText}>Get Hospital Directions</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status Timeline */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="clock" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Transport Progress</Text>
          </View>
          
          {ride.status === RIDE_STATUS.CANCELLED ? (
            <View style={styles.cancelledContainer}>
              <FontAwesome5 name="times-circle" size={24} color={COLORS.danger} />
              <Text style={styles.cancelledText}>This transport request has been cancelled</Text>
            </View>
          ) : (
            renderStatusTimeline()
          )}
        </View>

        {/* Status Update Button - only show if ride can be updated */}
        {nextStatus && ride.status !== RIDE_STATUS.CANCELLED && (
          <TouchableOpacity 
            style={styles.updateButton} 
            onPress={() => handleUpdateStatus(nextStatus)}
          >
            <FontAwesome5 name="arrow-circle-right" size={16} color={COLORS.white} />
            <Text style={styles.updateButtonText}>
              Update Status to "{STATUS_DISPLAY[nextStatus]}"
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('DriverHome')}>
          <FontAwesome5 name="home" size={24} color={COLORS.gray} />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tabItem}>
          <FontAwesome5 name="ambulance" size={24} color={COLORS.primary} solid />
          <Text style={[styles.tabLabel, styles.activeTabLabel]}>Active Ride</Text>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.primary,
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
  scrollContent: {
    padding: 16,
    paddingBottom: 80, // Leave space for tab bar
  },
  statusBadgeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  rideId: {
    fontSize: 12,
    color: COLORS.gray,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginLeft: 8,
  },
  emergencyType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  agentInfo: {
    marginBottom: 8,
  },
  agentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 12,
  },
  locationInfo: {
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 4,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 4,
  },
  callButtonText: {
    color: COLORS.white,
    marginLeft: 8,
    fontWeight: '500',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 8,
  },
  mapButtonText: {
    color: COLORS.white,
    marginLeft: 8,
    fontWeight: '500',
  },
  hospitalInfo: {
    marginBottom: 8,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  tripTime: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 8,
  },
  timelineContainer: {
    marginTop: 8,
  },
  timelineItem: {
    marginBottom: 12,
  },
  timelineStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineCircleActive: {
    borderColor: COLORS.primary,
  },
  timelineCircleInactive: {
    borderColor: '#E0E0E0',
  },
  timelineCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  timelineLine: {
    height: 2,
    flex: 1,
    marginLeft: -2,
  },
  timelineLineActive: {
    backgroundColor: COLORS.primary,
  },
  timelineLineInactive: {
    backgroundColor: '#E0E0E0',
  },
  timelineLabel: {
    marginLeft: 32,
    marginTop: -20,
    fontSize: 14,
  },
  timelineLabelActive: {
    color: COLORS.dark,
    fontWeight: '500',
  },
  timelineLabelInactive: {
    color: COLORS.gray,
  },
  cancelledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  cancelledText: {
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.danger,
    fontWeight: '500',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  updateButtonText: {
    color: COLORS.white,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
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

export default DriverActiveRide;