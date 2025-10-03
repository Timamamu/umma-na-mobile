// src/screens/SettingsScreen.tsx - Updated to show proper catchment area names
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Switch,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { 
  updateDriverAvailability, 
  getChipsActiveRide, 
  getDriverActiveRide,
  getCatchmentAreas
} from '../services/api';

// Define extended user types to properly handle properties
interface ExtendedUser {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  username: string;
  role?: 'chips' | 'driver';
  isAvailable?: boolean;
  vehicleType?: string;
  assignedCatchmentAreas?: string[];
  catchmentAreaIds?: string[];
}

// Define catchment area type
interface CatchmentArea {
  id: string;
  name: string;
  settlement: string;
  ward: string;
  lga: string;
  location: {
    lat: number;
    lng: number;
  };
}

const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [catchmentAreas, setCatchmentAreas] = useState<CatchmentArea[]>([]);
  const [catchmentLoading, setCatchmentLoading] = useState(false);

  // Safely cast user to the extended type
  const extendedUser = user as unknown as ExtendedUser;

  // Determine user type based on role or available properties
  const determineUserType = () => {
    if (!extendedUser) return { isChipsAgent: false, isDriver: false };
    
    // Check if user has properties that would indicate it's a CHIPS agent
    const isChipsAgent = !!extendedUser.catchmentAreaIds || extendedUser.role === 'chips';
    
    // Check if user has properties that would indicate it's a driver
    const isDriver = !!extendedUser.vehicleType || 
                    !!extendedUser.assignedCatchmentAreas || 
                    extendedUser.role === 'driver';
    
    return { isChipsAgent, isDriver };
  };

  const { isChipsAgent, isDriver } = determineUserType();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // If driver, get availability status
        if (isDriver && extendedUser?.id) {
          setIsAvailable(extendedUser.isAvailable ?? false);
          const ride = await getDriverActiveRide(extendedUser.id);
          setActiveRide(ride);
        }
        
        // If CHIPS agent, check active ride
        if (isChipsAgent && extendedUser?.id) {
          const ride = await getChipsActiveRide(extendedUser.id);
          setActiveRide(ride);
        }

        // Fetch catchment areas if needed
        if ((isChipsAgent && extendedUser?.catchmentAreaIds?.length) || 
            (isDriver && extendedUser?.assignedCatchmentAreas?.length)) {
          setCatchmentLoading(true);
          const areas = await getCatchmentAreas();
          setCatchmentAreas(areas || []);
          setCatchmentLoading(false);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [extendedUser, isDriver, isChipsAgent]);

  // Helper function to get area details by ID
  const getAreaById = (areaId: string) => {
    return catchmentAreas.find(area => area.id === areaId);
  };

  const handleAvailabilityToggle = async (value: boolean) => {
    if (!extendedUser || !isDriver) return;
    
    // If there's an active ride, don't allow toggling to unavailable
    if (activeRide && !value) {
      Alert.alert(
        'Cannot Change Availability', 
        'You cannot set yourself as unavailable while you have an active transport assignment.'
      );
      return;
    }
    
    setIsAvailable(value);
    try {
      await updateDriverAvailability(extendedUser.id, value);
    } catch (error) {
      console.error('Error updating availability', error);
      Alert.alert('Error', 'Could not update availability status.');
      setIsAvailable(!value); // Revert switch if update fails
    }
  };

  const handleLogout = () => {
    // If there's an active ride, warn before logging out
    if (activeRide) {
      Alert.alert(
        'Active Ride in Progress',
        'You have an active emergency transport request. Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Logout', 
            style: 'destructive', 
            onPress: () => {
              logout();
            } 
          }
        ]
      );
    } else {
      Alert.alert(
        'Confirm Logout',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: logout }
        ]
      );
    }
  };

  const handleViewActiveRide = () => {
    if (!activeRide) return;
    
    if (isChipsAgent) {
      navigation.navigate('ActiveRide', { rideId: activeRide.id });
    } else if (isDriver) {
      navigation.navigate('DriverActiveRide', { rideId: activeRide.id });
    }
  };

  const handleViewHistory = () => {
    if (isChipsAgent) {
      navigation.navigate('ChipsHistory');
    } else if (isDriver) {
      navigation.navigate('DriverRideHistory');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
        
        {/* Bottom Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => navigation.navigate(isChipsAgent ? 'ChipsHome' : 'DriverHome')}
          >
            <FontAwesome5 name="home" size={24} color={COLORS.gray} />
            <Text style={styles.tabLabel}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => {
              if (activeRide?.id) {
                handleViewActiveRide();
              } else {
                Alert.alert('No Active Ride', 'You don\'t have any active transport requests.');
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
          
          <TouchableOpacity style={styles.tabItem}>
            <FontAwesome5 name="user" size={24} color={COLORS.primary} solid />
            <Text style={[styles.tabLabel, styles.activeTabLabel]}>Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account Settings</Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <FontAwesome5 
                name={isChipsAgent ? "user-nurse" : "user-tie"} 
                size={40} 
                color={COLORS.white} 
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>
                {extendedUser?.firstName || ''} {extendedUser?.lastName || ''}
              </Text>
              <Text style={styles.userRole}>
                {isChipsAgent ? 'CHIPS Agent' : 'ETS Driver'}
              </Text>
            </View>
          </View>
          
          <View style={styles.profileDetails}>
            <View style={styles.detailRow}>
              <FontAwesome5 name="phone" size={16} color={COLORS.primary} />
              <Text style={styles.detailText}>{extendedUser?.phoneNumber || ''}</Text>
            </View>
            <View style={styles.detailRow}>
              <FontAwesome5 name="user" size={16} color={COLORS.primary} />
              <Text style={styles.detailText}>{extendedUser?.username || ''}</Text>
            </View>
          </View>
        </View>

        {/* Driver-specific Settings */}
        {isDriver && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver Settings</Text>
            
            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Availability Status</Text>
                  <Text style={styles.settingDescription}>
                    {isAvailable 
                      ? 'You are currently available for emergency transport requests' 
                      : 'You are not receiving any emergency transport requests'}
                  </Text>
                </View>
                <Switch
                  value={isAvailable}
                  onValueChange={handleAvailabilityToggle}
                  trackColor={{ false: '#E0E0E0', true: COLORS.accent }}
                  thumbColor={isAvailable ? COLORS.secondary : '#FFFFFF'}
                  ios_backgroundColor="#E0E0E0"
                  disabled={!!activeRide && !isAvailable}
                />
              </View>
            </View>
            
            {/* Vehicle Type - safely access with type checking */}
            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Vehicle Type</Text>
                  <Text style={styles.settingSubtitle}>
                    {extendedUser?.vehicleType || 'Unknown'}
                  </Text>
                </View>
                <FontAwesome5 
                  name={extendedUser?.vehicleType === 'car' ? 'car' : 'motorcycle'} 
                  size={22} 
                  color={COLORS.primary} 
                />
              </View>
            </View>
            
            {/* Assigned Areas - with proper name resolution */}
            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <Text style={styles.settingLabel}>Assigned Areas</Text>
              </View>
              
              {catchmentLoading && (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ margin: 10 }} />
              )}
              
              {!catchmentLoading && extendedUser?.assignedCatchmentAreas && 
               extendedUser.assignedCatchmentAreas.length > 0 ? (
                extendedUser.assignedCatchmentAreas.map((areaId: string, index: number) => {
                  const area = getAreaById(areaId);
                  return (
                    <View key={index} style={styles.areaItem}>
                      <FontAwesome5 name="map-marker-alt" size={16} color={COLORS.primary} />
                      <Text style={styles.areaName}>
                        {area ? area.name : areaId} {/* Fall back to ID if area not found */}
                        {area && <Text style={styles.areaSubtext}>
                          {area.settlement}, {area.ward}, {area.lga}
                        </Text>}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>
                  {catchmentLoading ? 'Loading assigned areas...' : 'No areas assigned'}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* CHIPS-specific Settings */}
        {isChipsAgent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CHIPS Agent Settings</Text>
            
            {/* Catchment Areas - with proper name resolution */}
            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <Text style={styles.settingLabel}>Assigned Catchment Areas</Text>
              </View>
              
              {catchmentLoading && (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ margin: 10 }} />
              )}
              
              {!catchmentLoading && extendedUser?.catchmentAreaIds && 
               extendedUser.catchmentAreaIds.length > 0 ? (
                extendedUser.catchmentAreaIds.map((areaId: string, index: number) => {
                  const area = getAreaById(areaId);
                  return (
                    <View key={index} style={styles.areaItem}>
                      <FontAwesome5 name="map-marker-alt" size={16} color={COLORS.primary} />
                      <View style={styles.areaContent}>
                        <Text style={styles.areaName}>
                          {area ? area.name : areaId} {/* Fall back to ID if area not found */}
                        </Text>
                        {area && (
                          <Text style={styles.areaSubtext}>
                            {area.settlement}, {area.ward}, {area.lga}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>
                  {catchmentLoading ? 'Loading catchment areas...' : 'No catchment areas assigned'}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <TouchableOpacity style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Language</Text>
                <Text style={styles.settingSubtitle}>English</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color={COLORS.gray} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Notifications</Text>
                <Text style={styles.settingSubtitle}>Manage notification settings</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color={COLORS.gray} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Support & About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & About</Text>
          
          <TouchableOpacity 
            style={styles.settingCard}
            onPress={() => navigation.navigate('Support')}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Help & Support</Text>
                <Text style={styles.settingSubtitle}>Get help with the app</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color={COLORS.gray} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>About UMMA-NA</Text>
                <Text style={styles.settingSubtitle}>Version 1.0.0</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color={COLORS.gray} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <FontAwesome5 name="sign-out-alt" size={18} color={COLORS.white} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>UMMA-NA Emergency Transport System</Text>
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => navigation.navigate(isChipsAgent ? 'ChipsHome' : 'DriverHome')}
        >
          <FontAwesome5 name="home" size={24} color={COLORS.gray} />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => {
            if (activeRide?.id) {
              handleViewActiveRide();
            } else {
              Alert.alert('No Active Ride', 'You don\'t have any active transport requests.');
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
        
        <TouchableOpacity style={styles.tabItem}>
          <FontAwesome5 name="user" size={24} color={COLORS.primary} solid />
          <Text style={[styles.tabLabel, styles.activeTabLabel]}>Account</Text>
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
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
    padding: 16,
    paddingBottom: 80, // Space for tab bar
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: COLORS.gray,
  },
  profileDetails: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: COLORS.dark,
    marginLeft: 12,
  },
  settingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingHeader: {
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: COLORS.gray,
  },
  settingSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  areaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  areaContent: {
    flex: 1,
    marginLeft: 12,
  },
  areaName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.dark,
  },
  areaSubtext: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 8,
  },
  logoutButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  logoutButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray,
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

export default SettingsScreen;