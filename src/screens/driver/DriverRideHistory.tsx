// src/screens/driver/DriverRideHistory.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, RIDE_STATUS, STATUS_DISPLAY } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { getDriverRideHistory } from '../../services/api';

interface RideHistory {
  id: string;
  complicationType: string;
  status: string;
  createdAt: any;
  chipsAgentDetails?: {
    name: string;
  };
  hospitalAssigned?: {
    name: string;
  };
  pickupLocation?: {
    lat: number;
    lng: number;
  };
}

const DriverRideHistory: React.FC = () => {
  const [history, setHistory] = useState<RideHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const fetchRideHistory = useCallback(async () => {
    try {
      setLoading(true);
      if (user?.id) {
        console.log('Fetching ride history for driver:', user.id);
        const rideHistory = await getDriverRideHistory(user.id);
        console.log(`Fetched ${rideHistory.length} ride history items`);
        setHistory(rideHistory);
      } else {
        console.log('No user ID available to fetch ride history');
      }
    } catch (error) {
      console.error('Error fetching ride history:', error);
      Alert.alert('Error', 'Could not load ride history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRideHistory();
  }, [fetchRideHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRideHistory();
  };

  const handleHomePress = () => {
    navigation.navigate('DriverHome');
  };

  const handleActiveRide = () => {
    navigation.navigate('DriverActiveRide');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const formatDate = (dateValue: any) => {
    try {
      // Check if date is null or undefined
      if (!dateValue) {
        return 'No date';
      }
      
      // Handle ISO string
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        // Check if date is valid
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      
      // Handle Firebase server timestamp (object with seconds and nanoseconds)
      if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue) {
        return new Date(dateValue.seconds * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // If we get here, return string representation
      return String(dateValue);
    } catch (error) {
      console.error('Error formatting date:', error, dateValue);
      return 'Date error';
    }
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

  const handleViewRide = (ride: RideHistory) => {
    if ([RIDE_STATUS.PENDING, RIDE_STATUS.ACCEPTED, RIDE_STATUS.EN_ROUTE_TO_PICKUP, 
         RIDE_STATUS.ARRIVED_AT_PICKUP, RIDE_STATUS.EN_ROUTE_TO_HOSPITAL, 
         RIDE_STATUS.ARRIVED_AT_HOSPITAL].includes(ride.status)) {
      // If ride is active, navigate to active ride screen
      navigation.navigate('DriverActiveRide', { rideId: ride.id });
    } else {
      // For completed/cancelled rides we could show a detail view
      // or just show an alert for now
      Alert.alert(
        'Transport Details',
        `Emergency Type: ${ride.complicationType.replace(/_/g, ' ')}\nStatus: ${STATUS_DISPLAY[ride.status]}\nDate: ${formatDate(ride.createdAt)}\nHospital: ${ride.hospitalAssigned?.name || 'Not assigned'}`,
        [{ text: 'OK' }]
      );
    }
  };

  const renderRideItem = ({ item }: { item: RideHistory }) => {
    return (
      <TouchableOpacity 
        style={styles.rideCard}
        onPress={() => handleViewRide(item)}
      >
        <View style={styles.rideHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>
              {STATUS_DISPLAY[item.status] || item.status.replace(/_/g, ' ')}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.rideDetails}>
          <View style={styles.detailRow}>
            <FontAwesome5 name="heartbeat" size={16} color={COLORS.primary} />
            <Text style={styles.detailText}>
              {item.complicationType ? item.complicationType.replace(/_/g, ' ') : 'Unknown'}
            </Text>
          </View>

          {item.chipsAgentDetails?.name && (
            <View style={styles.detailRow}>
              <FontAwesome5 name="user" size={16} color={COLORS.primary} />
              <Text style={styles.detailText}>
                Agent: {item.chipsAgentDetails.name}
              </Text>
            </View>
          )}

          {item.hospitalAssigned?.name && (
            <View style={styles.detailRow}>
              <FontAwesome5 name="hospital" size={16} color={COLORS.primary} />
              <Text style={styles.detailText}>
                {item.hospitalAssigned.name}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.viewDetailsContainer}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <FontAwesome5 name="chevron-right" size={12} color={COLORS.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome5 name="history" size={50} color={COLORS.gray} />
      <Text style={styles.emptyTitle}>No Transport History</Text>
      <Text style={styles.emptyText}>
        You haven't completed any transport assignments yet.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transport History</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderRideItem}
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
        
        <TouchableOpacity style={styles.tabItem}>
          <FontAwesome5 name="history" size={24} color={COLORS.primary} solid />
          <Text style={[styles.tabLabel, styles.activeTabLabel]}>Activity</Text>
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
  header: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
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
  listContent: {
    padding: 16,
    paddingBottom: 80, // Space for tab bar
  },
  rideCard: {
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
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  rideDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.dark,
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
    paddingTop: 10,
  },
  viewDetailsText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 8,
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

export default DriverRideHistory;