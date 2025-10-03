import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  SafeAreaView,
  ScrollView,
  Modal,
  FlatList,
  SectionList,
  Image,
  Dimensions
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { requestRide, getCatchmentAreas, getChipsActiveRide } from '../../services/api';
import { SYMPTOMS, SYMPTOM_CATEGORIES } from '../../constants/SYMPTOMS';
import { COLORS } from '../../constants';
import { useNavigation } from '@react-navigation/native';

// Import available Health Icons for symptoms
// Note: Import only the icons that are actually available
import { 
  Headache, 
  Vomiting,
  Pregnant,
  Stomach,
  BackPain,
  BloodDrop,
  Bacteria,
  Person,
  Fever
} from 'healthicons-react-native/dist/filled';

// Get screen dimensions for responsive positioning
const { width, height } = Dimensions.get('window');

type RequestRideNavigationProp = {
  navigate: (screen: string, params?: any) => void;
  replace: (screen: string, params?: any) => void;
  goBack: () => void;
};

// Add these interfaces if they're not in your types.d.ts file
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

interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'chips' | 'driver';
  username?: string;
  isAvailable?: boolean;
}

interface RideRequest {
  id: string;
  chipsAgentId: string;
  symptoms: string[];
  complicationType: string;
  conditionName?: string;
  pickupLocation: {
    lat: number;
    lng: number;
  };
  status: string;
  createdAt: any;
  [key: string]: any;
}

// Define types for the body regions
type BodyRegionKey = 'head' | 'abdomen' | 'pelvis' | 'limbs' | 'general';

type BodyRegionInfo = {
  name: string;
  symptoms: string[];
};

type BodyRegionsType = {
  [key in BodyRegionKey]: BodyRegionInfo;
};

// Helper function to determine appropriate body size based on screen dimensions
const getBodySize = () => {
  // For smaller devices, use less screen real estate
  if (width < 350) {
    return {
      width: width * 0.65,
      height: height * 0.45
    };
  }
  // For larger devices, use more space
  return {
    width: width * 0.75, 
    height: height * 0.65
  };
};

const RequestRide: React.FC = () => {
  const { user } = useAuth() as { user: User | null };
  const navigation = useNavigation<RequestRideNavigationProp>();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [requestLoading, setRequestLoading] = useState(false);
  const [catchmentAreas, setCatchmentAreas] = useState<CatchmentArea[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [showAreaSelector, setShowAreaSelector] = useState(false);
  const [selectedArea, setSelectedArea] = useState<CatchmentArea | null>(null);
  const [locationType, setLocationType] = useState<'gps' | 'catchment'>('gps');
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [showSymptomSelector, setShowSymptomSelector] = useState(false);
  
  // New body selector state
  const [activeRegion, setActiveRegion] = useState<BodyRegionKey | null>(null);
  const [showRegionSymptoms, setShowRegionSymptoms] = useState(false);
  
  // Get body size based on device dimensions
  const bodySize = getBodySize();

  // Map of body regions to symptom IDs
  const bodyRegions: BodyRegionsType = {
    head: {
      name: 'Head & Face',
      symptoms: ['severe_headache', 'blurry_vision', 'vomiting', 'convulsions']
    },
    abdomen: {
      name: 'Abdomen',
      symptoms: ['no_fetal_movement', 'abdominal_pain', 'prolonged_labor', 'back_pain', 'baby_not_coming']
    },
    pelvis: {
      name: 'Pelvic Area',
      symptoms: [
        'heavy_bleeding', 
        'bloody_discharge', 
        'water_breaking', 
        'foul_discharge', 
        'heavy_bleeding_after_delivery',
        'painful_urination',
        'mucus_discharge'
      ]
    },
    limbs: {
      name: 'Arms & Legs',
      symptoms: ['swollen_hands_feet']
    },
    general: {
      name: 'General',
      symptoms: [
        'preterm_labor', 
        'weakness', 
        'fever', 
        'unconsciousness', 
        'high_bp',
        'convulsions',
        'baby_moving'
      ]
    }
  };

  // Get user location, load catchment areas, and check for active ride
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLocationLoading(true);
        
        // Check for active ride
        if (user?.id) {
          const ride = await getChipsActiveRide(user.id);
          setActiveRide(ride);
          
          // If there's an active ride, show alert and go back
          if (ride) {
            Alert.alert(
              'Active Ride Exists',
              'You already have an active emergency transport request. You cannot create a new request until the current one is completed.',
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }
        }
        
        // Get catchment areas
        setAreasLoading(true);
        const areas = await getCatchmentAreas();
        setCatchmentAreas(areas);
        setAreasLoading(false);
        
        // Get current location
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert(
            'Location Permission Required', 
            'We need access to your location to connect you with the nearest emergency transport.',
            [
              { text: 'Try Again', onPress: () => navigation.replace('RequestRide') },
              { text: 'Cancel', onPress: () => navigation.goBack(), style: 'cancel' }
            ]
          );
          return;
        }
        
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        
        setLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude
        });
      } catch (error) {
        console.error('Error getting location or catchment areas:', error);
        Alert.alert(
          'Location Error', 
          'Could not determine your location. Please try using the catchment area selection instead.'
        );
      } finally {
        setLocationLoading(false);
      }
    };

    fetchData();
  }, [navigation, user]);

  const handleSymptomSelect = (symptomId: string) => {
    setSelectedSymptoms(prev => {
      if (prev.includes(symptomId)) {
        return prev.filter(id => id !== symptomId);
      } else {
        return [...prev, symptomId];
      }
    });
  };

  // Check if a region has any selected symptoms
  const hasSelectedInRegion = (region: BodyRegionKey) => {
    const regionSymptoms = bodyRegions[region].symptoms || [];
    return regionSymptoms.some(id => selectedSymptoms.includes(id));
  };

  // Get symptoms for the active region
  const getRegionSymptoms = () => {
    if (!activeRegion) return [];
    
    const regionSymptomIds = bodyRegions[activeRegion].symptoms || [];
    return SYMPTOMS.filter(symptom => regionSymptomIds.includes(symptom.id));
  };

  // Handle body region selection
  const selectBodyRegion = (region: BodyRegionKey) => {
    setActiveRegion(region);
    setShowRegionSymptoms(true);
  };

  // Get symptom name by ID
  const getSymptomName = (id: string): string => {
    const symptom = SYMPTOMS.find(s => s.id === id);
    return symptom ? symptom.name : id;
  };

  // Get symptom icon by ID - using FontAwesome as fallback
  const getSymptomIcon = (id: string) => {
    const symptom = SYMPTOMS.find(s => s.id === id);
    if (!symptom) return <FontAwesome5 name="question-circle" size={24} color={COLORS.primary} />;
    
    // Map specific symptoms to appropriate icons
    switch(id) {
      case 'severe_headache':
        return <Headache width={24} height={24} color={COLORS.primary} />;
      case 'vomiting':
        return <Vomiting width={24} height={24} color={COLORS.primary} />;
      case 'abdominal_pain':
        return <Stomach width={24} height={24} color={COLORS.primary} />;
      case 'back_pain':
        return <BackPain width={24} height={24} color={COLORS.primary} />;
      case 'heavy_bleeding':
      case 'bloody_discharge':
      case 'heavy_bleeding_after_delivery':
        return <BloodDrop width={24} height={24} color={COLORS.primary} />;
      case 'fever':
        return <Fever width={24} height={24} color={COLORS.primary} />;
      case 'preterm_labor':
        return <Pregnant width={24} height={24} color={COLORS.primary} />;
      case 'foul_discharge':
      case 'mucus_discharge':
        return <Bacteria width={24} height={24} color={COLORS.primary} />;
      case 'swollen_hands_feet':
        return <Person width={24} height={24} color={COLORS.primary} />;
      // Use FontAwesome for icons that aren't available in healthicons
      case 'blurry_vision':
        return <FontAwesome5 name="eye" size={24} color={COLORS.primary} />;
      case 'no_fetal_movement':
        return <FontAwesome5 name="baby" size={24} color={COLORS.primary} />;
      case 'baby_moving':
        return <FontAwesome5 name="baby" size={24} color={COLORS.primary} />;
      case 'prolonged_labor':
      case 'baby_not_coming':
        return <FontAwesome5 name="clock" size={24} color={COLORS.primary} />;
      case 'water_breaking':
        return <FontAwesome5 name="tint" size={24} color={COLORS.primary} />;
      case 'weakness':
        return <FontAwesome5 name="tired" size={24} color={COLORS.primary} />;
      case 'unconsciousness':
        return <FontAwesome5 name="dizzy" size={24} color={COLORS.primary} />;
      case 'high_bp':
        return <FontAwesome5 name="heartbeat" size={24} color={COLORS.primary} />;
      case 'convulsions':
        return <FontAwesome5 name="bolt" size={24} color={COLORS.primary} />;
      case 'painful_urination':
        return <FontAwesome5 name="fire-alt" size={24} color={COLORS.primary} />;
      default:
        return <FontAwesome5 name="question-circle" size={24} color={COLORS.primary} />;
    }
  };

  // Function to identify condition based on symptoms
  const identifyCondition = (symptoms: string[]): string | null => {
    // This function is a placeholder - the actual mapping happens on the backend
    // We would implement it here if we wanted to show the potential condition before submission
    if (symptoms.length === 0) return null;
    return "unknown"; // Default to unknown if no client-side mapping is needed
  };

  const handleSubmit = async () => {
    // Validate location
    if (!location && !selectedArea) {
      Alert.alert('Error', 'Please select a location or catchment area.');
      return;
    }

    // Validate symptoms
    if (selectedSymptoms.length === 0) {
      Alert.alert('Error', 'Please select at least one symptom.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Missing user information.');
      return;
    }

    // Use either GPS location or selected catchment area location
    const finalLocation = locationType === 'catchment' && selectedArea 
      ? selectedArea.location 
      : location;
      
    if (!finalLocation) {
      Alert.alert('Error', 'Missing location information.');
      return;
    }

    // Confirmation dialog (we'll let the backend determine the condition)
    Alert.alert(
      'Confirm Emergency Request',
      `Are you sure you want to request emergency transport based on the selected symptoms?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Request Transport', 
          style: 'destructive',
          onPress: async () => {
            try {
              setRequestLoading(true);
              await requestRide(user.id, selectedSymptoms, finalLocation.lat, finalLocation.lng);
              Alert.alert(
                'Transport Requested', 
                'Your emergency transport request has been sent. You will be notified when a driver accepts.',
                [{ text: 'OK', onPress: () => navigation.replace('ChipsHome') }]
              );
            } catch (error: unknown) {
              console.error('Request ride error:', error);
              
              // Handle specific error cases
              if (error instanceof Error) {
                if (error.message.includes('404')) {
                  Alert.alert(
                    'No Transport Available', 
                    'No suitable driver or hospital could be found for this emergency. Please try again or contact emergency services directly.'
                  );
                } else {
                  Alert.alert(
                    'Request Failed', 
                    'Could not send your transport request. Please try again.'
                  );
                }
              } else {
                Alert.alert(
                  'Request Failed', 
                  'Could not send your transport request. Please try again.'
                );
              }
            } finally {
              setRequestLoading(false);
            }
          }
        }
      ]
    );
  };

  const openAreaSelector = () => {
    setShowAreaSelector(true);
  };

  const selectArea = (area: CatchmentArea) => {
    setSelectedArea(area);
    setLocationType('catchment');
    setShowAreaSelector(false);
  };

  const useGpsLocation = () => {
    setLocationType('gps');
    setSelectedArea(null);
  };

  const goBack = () => {
    navigation.goBack();
  };

  const handleViewHistory = () => {
    navigation.navigate('ChipsHistory');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const openSymptomSelector = () => {
    setShowSymptomSelector(true);
  };

  // Prepare the data for the SectionList
  const getSectionData = () => {
    return SYMPTOM_CATEGORIES.map(category => ({
      title: category.name,
      data: category.symptoms
    }));
  };

  if (locationLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Getting your location...</Text>
          <Text style={styles.loadingSubtext}>This helps us find the nearest available transport</Text>
        </View>
        
        {/* Bottom Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('ChipsHome')}>
            <FontAwesome5 name="home" size={24} color={COLORS.gray} />
            <Text style={styles.tabLabel}>Home</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Emergency Transport</Text>
        <View style={styles.placeholderView} />
      </View>

      <ScrollView style={styles.contentContainer}>
        {/* Symptoms Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Symptoms</Text>
          <Text style={styles.sectionSubtitle}>
            Tap on the body to select symptoms the mother is experiencing
          </Text>

          {/* Body Selector with the pregnant woman image */}
          <View style={styles.bodyContainer}>
            <View style={[styles.bodyImageContainer, { width: bodySize.width, height: bodySize.height }]}>
              <Image
                source={require('../../../assets/pregnant-woman.png')}
                style={styles.bodyImage}
                resizeMode="contain"
              />
              
              {/* Head region */}
              <TouchableOpacity
                style={[
                  styles.touchRegion,
                  styles.headRegion,
                  hasSelectedInRegion('head') && styles.activeRegion
                ]}
                onPress={() => selectBodyRegion('head')}
              >
                <Text style={styles.regionLabel}>Head</Text>
              </TouchableOpacity>
              
              {/* Abdomen region */}
              <TouchableOpacity
                style={[
                  styles.touchRegion,
                  styles.abdomenRegion,
                  hasSelectedInRegion('abdomen') && styles.activeRegion
                ]}
                onPress={() => selectBodyRegion('abdomen')}
              >
                <Text style={styles.regionLabel}>Abdomen</Text>
              </TouchableOpacity>
              
              {/* Pelvis region */}
              <TouchableOpacity
                style={[
                  styles.touchRegion,
                  styles.pelvisRegion,
                  hasSelectedInRegion('pelvis') && styles.activeRegion
                ]}
                onPress={() => selectBodyRegion('pelvis')}
              >
                <Text style={styles.regionLabel}>Pelvis</Text>
              </TouchableOpacity>
              
              {/* Limbs */}
              <TouchableOpacity
                style={[
                  styles.touchRegion,
                  styles.limbsRegion,
                  hasSelectedInRegion('limbs') && styles.activeRegion
                ]}
                onPress={() => selectBodyRegion('limbs')}
              >
                <Text style={styles.regionLabel}>Arms & Legs</Text>
              </TouchableOpacity>
            </View>
            
            {/* General symptoms button */}
            <TouchableOpacity
              style={[
                styles.generalButton,
                hasSelectedInRegion('general') && styles.activeGeneralButton
              ]}
              onPress={() => selectBodyRegion('general')}
            >
              <Text style={[
                styles.generalButtonText,
                hasSelectedInRegion('general') && styles.activeGeneralText
              ]}>
                General Symptoms
              </Text>
            </TouchableOpacity>
          </View>

          {/* Selected Symptoms Summary */}
          <View style={styles.selectedSymptomsContainer}>
            <Text style={styles.summaryTitle}>
              Selected Symptoms ({selectedSymptoms.length})
            </Text>
            {selectedSymptoms.length === 0 ? (
              <Text style={styles.noSymptomsText}>
                No symptoms selected. Tap on the body to select symptoms.
              </Text>
            ) : (
              <View style={styles.symptomsChipContainer}>
                {selectedSymptoms.map(id => (
                  <View key={id} style={styles.symptomChip}>
                    <View style={styles.chipIcon}>
                      {getSymptomIcon(id)}
                    </View>
                    <Text style={styles.symptomChipText}>{getSymptomName(id)}</Text>
                    <TouchableOpacity
                      style={styles.removeSymptomButton}
                      onPress={() => handleSymptomSelect(id)}
                    >
                      <FontAwesome5 name="times" size={12} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.sectionSubtitle}>
            Select your location or choose from registered communities
          </Text>

          {/* Location Tab Selection */}
          <View style={styles.locationTabContainer}>
            <TouchableOpacity 
              style={[styles.locationTab, locationType === 'gps' && styles.activeLocationTab]}
              onPress={useGpsLocation}
            >
              <FontAwesome5 
                name="map-marker-alt" 
                size={16} 
                color={locationType === 'gps' ? COLORS.primary : COLORS.gray} 
              />
              <Text 
                style={[
                  styles.locationTabText, 
                  locationType === 'gps' && styles.activeLocationTabText
                ]}
              >
                Current GPS
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.locationTab, locationType === 'catchment' && styles.activeLocationTab]}
              onPress={openAreaSelector}
            >
              <FontAwesome5 
                name="map" 
                size={16} 
                color={locationType === 'catchment' ? COLORS.primary : COLORS.gray} 
              />
              <Text 
                style={[
                  styles.locationTabText, 
                  locationType === 'catchment' && styles.activeLocationTabText
                ]}
              >
                Catchment Area
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Show selected location option */}
          {locationType === 'gps' ? (
            <View style={styles.locationContainer}>
              {location ? (
                <>
                  <View style={styles.locationIconContainer}>
                    <FontAwesome5 name="map-marker-alt" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.locationText}>
                    Location detected: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </Text>
                </>
              ) : (
                <Text style={styles.errorText}>
                  Could not determine your location. Please try using a catchment area instead.
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.locationContainer}>
              {selectedArea ? (
                <>
                  <View style={styles.locationIconContainer}>
                    <FontAwesome5 name="map" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.selectedAreaContainer}>
                    <Text style={styles.selectedAreaName}>{selectedArea.name}</Text>
                    <Text style={styles.selectedAreaDetails}>
                      {selectedArea.settlement}, {selectedArea.ward}, {selectedArea.lga}
                    </Text>
                  </View>
                </>
              ) : (
                <TouchableOpacity 
                  style={styles.selectAreaButton} 
                  onPress={openAreaSelector}
                >
                  <FontAwesome5 name="map" size={16} color={COLORS.white} />
                  <Text style={styles.selectAreaButtonText}>
                    Select Catchment Area
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={[
            styles.requestButton, 
            ((!location && !selectedArea) || selectedSymptoms.length === 0 || requestLoading) && 
            styles.disabledButton
          ]} 
          onPress={handleSubmit} 
          disabled={(!location && !selectedArea) || selectedSymptoms.length === 0 || requestLoading}
        >
          {requestLoading ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <>
              <FontAwesome5 name="ambulance" size={20} color={COLORS.white} />
              <Text style={styles.requestButtonText}>Request Emergency Transport</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Emergency Notes */}
        <View style={styles.emergencyNoteContainer}>
          <Text style={styles.emergencyNoteText}>
            Please note: This system is for maternal health emergencies only. 
            For other medical emergencies, call local emergency services directly.
          </Text>
        </View>
      </ScrollView>

      {/* Region-Based Symptom Selector Modal */}
      <Modal
        visible={showRegionSymptoms}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRegionSymptoms(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeRegion ? bodyRegions[activeRegion].name : ''} Symptoms
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowRegionSymptoms(false)}
              >
                <FontAwesome5 name="times" size={20} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={getRegionSymptoms()}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.symptomItem,
                    selectedSymptoms.includes(item.id) && styles.selectedSymptomItem
                  ]}
                  onPress={() => handleSymptomSelect(item.id)}
                >
                  <View style={styles.symptomInfo}>
                    <View style={styles.symptomIcon}>
                      {getSymptomIcon(item.id)}
                    </View>
                    <View style={styles.symptomTextContainer}>
                      <Text style={styles.symptomName}>{item.name}</Text>
                      <Text style={styles.symptomDescription}>{item.description}</Text>
                    </View>
                  </View>
                  
                  {selectedSymptoms.includes(item.id) ? (
                    <View style={styles.checkmarkContainer}>
                      <FontAwesome5 name="check" size={16} color={COLORS.white} />
                    </View>
                  ) : (
                    <View style={styles.uncheckedContainer}>
                      <FontAwesome5 name="plus" size={16} color={COLORS.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.noSymptomsForRegion}>
                  No symptoms defined for this region
                </Text>
              }
            />
            
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowRegionSymptoms(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Legacy Symptom Selector Modal (SectionList) - can be kept for backward compatibility */}
      <Modal
        visible={showSymptomSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSymptomSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Symptoms</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowSymptomSelector(false)}
              >
                <FontAwesome5 name="times" size={20} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
            
            <SectionList
              sections={getSectionData()}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.symptomItem,
                    selectedSymptoms.includes(item.id) && styles.selectedSymptomItem
                  ]} 
                  onPress={() => handleSymptomSelect(item.id)}
                >
                  <View style={styles.symptomInfo}>
                    <View style={styles.symptomIcon}>
                      {getSymptomIcon(item.id)}
                    </View>
                    <View style={styles.symptomTextContainer}>
                      <Text style={[
                        styles.symptomName,
                        selectedSymptoms.includes(item.id) && styles.selectedSymptomItemText
                      ]}>
                        {item.name}
                      </Text>
                      <Text style={styles.symptomDescription}>
                        {item.description}
                      </Text>
                    </View>
                  </View>
                  {selectedSymptoms.includes(item.id) ? (
                    <View style={styles.checkmarkContainer}>
                      <FontAwesome5 name="check" size={16} color={COLORS.white} />
                    </View>
                  ) : (
                    <View style={styles.uncheckedContainer}>
                      <FontAwesome5 name="plus" size={16} color={COLORS.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              renderSectionHeader={({ section: { title } }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{title}</Text>
                </View>
              )}
              style={styles.symptomsList}
            />
            
            <TouchableOpacity 
              style={styles.doneButton}
              onPress={() => setShowSymptomSelector(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Catchment Area Selector Modal */}
      <Modal
        visible={showAreaSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAreaSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Catchment Area</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowAreaSelector(false)}
              >
                <FontAwesome5 name="times" size={20} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
            
            {areasLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={styles.modalLoading} />
            ) : catchmentAreas.length === 0 ? (
              <Text style={styles.modalEmptyText}>No catchment areas found.</Text>
            ) : (
              <FlatList
                data={catchmentAreas}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.areaItem} 
                    onPress={() => selectArea(item)}
                  >
                    <View style={styles.areaIconContainer}>
                      <FontAwesome5 name="map-marker-alt" size={16} color={COLORS.primary} />
                    </View>
                    <View style={styles.areaDetails}>
                      <Text style={styles.areaName}>{item.name}</Text>
                      <Text style={styles.areaLocation}>
                        {item.settlement}, {item.ward}, {item.lga}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                style={styles.areaList}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('ChipsHome')}>
          <FontAwesome5 name="home" size={24} color={COLORS.gray} />
          <Text style={styles.tabLabel}>Home</Text>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
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
  placeholderView: {
    width: 36, // Same width as back button for balanced layout
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 80, // Add padding for tab bar
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 16,
  },
  // Body Selector Styles
  bodyContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bodyImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  bodyImage: {
    width: '100%',
    height: '100%',
  },
  // Touchable regions
  touchRegion: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(91, 54, 87, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionLabel: {
    fontSize: 10,
    color: 'transparent', // Make text invisible but keep for accessibility
  },
  activeRegion: {
    backgroundColor: 'rgba(91, 54, 87, 0.3)',
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  // Positions for each region based on the pregnant woman image
  headRegion: {
    top: '8%',
    left: '32%',
    width: '36%',
    height: '17%',
    borderRadius: 50,
  },
  abdomenRegion: {
    top: '30%',
    left: '22%',
    width: '56%',
    height: '16%',
    borderRadius: 15,
  },
  pelvisRegion: {
    top: '47%',
    left: '22%',
    width: '56%',
    height: '10%',
    borderRadius: 15,
  },
  limbsRegion: {
    top: '80%',
    left: '25%',
    width: '48%',
    height: '12%',
    borderRadius: 15,
  },
  // General symptoms button
  generalButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    elevation: 2,
  },
  activeGeneralButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  generalButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
  },
  activeGeneralText: {
    color: COLORS.white,
  },
  // Selected symptoms summary
  selectedSymptomsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: COLORS.dark,
  },
  noSymptomsText: {
    fontStyle: 'italic',
    color: COLORS.gray,
  },
  symptomsChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  symptomChip: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipIcon: {
    marginRight: 6,
    transform: [{ scale: 0.7 }], // Make the icons smaller in the chips
  },
  symptomChipText: {
    color: COLORS.white,
    marginRight: 8,
    fontSize: 14,
  },
  removeSymptomButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectSymptomsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    marginTop: 12,
  },
  selectSymptomsButtonText: {
    color: COLORS.primary,
    fontWeight: '500',
    marginRight: 8,
  },
  // Modal Styles for Region Symptoms
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  modalCloseButton: {
    padding: 8,
  },
  symptomItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  selectedSymptomItem: {
    backgroundColor: 'rgba(91, 54, 87, 0.1)',
  },
  symptomInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  symptomIcon: {
    marginRight: 12,
  },
  symptomTextContainer: {
    flex: 1,
  },
  symptomName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.dark,
    marginBottom: 4,
  },
  selectedSymptomItemText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  symptomDescription: {
    fontSize: 14,
    color: COLORS.gray,
  },
  checkmarkContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncheckedContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(91, 54, 87, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSymptomsForRegion: {
    padding: 20,
    textAlign: 'center',
    fontStyle: 'italic',
    color: COLORS.gray,
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    margin: 16,
  },
  doneButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Original symptom selector styles
  symptomsList: {
    flex: 1,
  },
  sectionHeader: {
    backgroundColor: '#F5F5F5',
    padding: 10,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  // Location styles
  locationTabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  locationTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  activeLocationTab: {
    backgroundColor: 'rgba(91, 54, 87, 0.05)',
    borderColor: COLORS.primary,
  },
  locationTabText: {
    fontSize: 14,
    marginLeft: 8,
    color: COLORS.gray,
  },
  activeLocationTabText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  locationIconContainer: {
    marginRight: 12,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.dark,
    flex: 1,
  },
  selectedAreaContainer: {
    flex: 1,
  },
  selectedAreaName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  selectedAreaDetails: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  selectAreaButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  selectAreaButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    flex: 1,
  },
  requestButton: {
    backgroundColor: COLORS.danger, // Using danger color for emergency
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  requestButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  emergencyNoteContainer: {
    padding: 16,
    backgroundColor: '#FFF8E1', // Light amber background
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  emergencyNoteText: {
    fontSize: 14,
    color: '#5D4037', // Dark brown text
    lineHeight: 20,
  },
  // Catchment area modal styles
  modalLoading: {
    marginTop: 50,
  },
  modalEmptyText: {
    margin: 30,
    textAlign: 'center',
    color: COLORS.gray,
  },
  areaList: {
    flex: 1,
  },
  areaItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    alignItems: 'center',
  },
  areaIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(91, 54, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  areaDetails: {
    flex: 1,
  },
  areaName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  areaLocation: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
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

export default RequestRide;