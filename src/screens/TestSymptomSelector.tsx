import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
  Dimensions
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../constants';

// Import available Health Icons
// Note: Some icons were missing in the original import path
// Import available icons that exist in the package
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

// For icons that aren't available, we'll use FontAwesome5 as fallbacks
// or other available icons that serve similar purposes

// Get screen dimensions for responsive positioning
const { width, height } = Dimensions.get('window');

// Define types for the body regions
type BodyRegionKey = 'head' | 'abdomen' | 'pelvis' | 'limbs' | 'general';

type BodyRegionInfo = {
  name: string;
  symptoms: string[];
};

type BodyRegionsType = {
  [key in BodyRegionKey]: BodyRegionInfo;
};

// Define symptom type
type Symptom = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
};

// Helper function to determine appropriate body size based on screen dimensions
const getBodySize = () => {
  // For smaller devices, use less screen real estate
  if (width < 350) {
    return {
      width: width * 0.65,
      height: height * 0.55
    };
  }
  // For larger devices, use more space
  return {
    width: width * 0.75, 
    height: height * 0.75
  };
};

const TestSymptomSelector = () => {
  // State for selected symptoms
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  
  // State for active body region
  const [activeRegion, setActiveRegion] = useState<BodyRegionKey | null>(null);
  
  // State for symptoms modal
  const [symptomsModalVisible, setSymptomsModalVisible] = useState(false);
  
  // Get body size based on device dimensions
  const bodySize = getBodySize();

  // Map of body regions to symptom IDs
  const bodyRegions: BodyRegionsType = {
    head: {
      name: 'Head & Face',
      symptoms: ['severe_headache', 'blurry_vision', 'vomiting']
    },
    abdomen: {
      name: 'Abdomen',
      symptoms: ['no_fetal_movement', 'abdominal_pain', 'prolonged_labor', 'back_pain']
    },
    pelvis: {
      name: 'Pelvic Area',
      symptoms: ['heavy_bleeding', 'bloody_discharge', 'water_breaking', 'foul_discharge']
    },
    limbs: {
      name: 'Arms & Legs',
      symptoms: ['swollen_hands_feet']
    },
    general: {
      name: 'General',
      symptoms: ['preterm_labor', 'weakness', 'fever', 'unconsciousness', 'high_bp']
    }
  };

  // Define symptoms with alternative icons for those that were missing
  const SYMPTOMS: Symptom[] = [
    {
      id: 'severe_headache',
      name: 'Severe Headache',
      description: 'Intense pain in the head that may be throbbing or persistent',
      icon: <Headache width={24} height={24} color={COLORS.primary} />
    },
    {
      id: 'blurry_vision',
      name: 'Blurry Vision',
      description: 'Difficulty seeing clearly or focusing on objects',
      icon: <FontAwesome5 name="eye" size={24} color={COLORS.primary} />
    },
    {
      id: 'vomiting',
      name: 'Vomiting',
      description: 'Forceful expulsion of stomach contents through the mouth',
      icon: <Vomiting width={24} height={24} color={COLORS.primary} />
    },
    {
      id: 'no_fetal_movement',
      name: 'No Movement From Baby',
      description: 'Absence of usual fetal movements or kicks',
      icon: <FontAwesome5 name="baby" size={24} color={COLORS.primary} />
    },
    {
      id: 'abdominal_pain',
      name: 'Sharp Abdominal Pain',
      description: 'Sudden, intense pain in the abdominal region',
      icon: <Stomach width={24} height={24} color={COLORS.primary} />
    },
    {
      id: 'prolonged_labor',
      name: 'Prolonged Labor',
      description: 'Labor that lasts longer than expected or is not progressing',
      icon: <FontAwesome5 name="clock" size={24} color={COLORS.primary} />
    },
    {
      id: 'back_pain',
      name: 'Lower Back Pain',
      description: 'Pain in the lower back area that may be sharp or dull',
      icon: <BackPain width={24} height={24} color={COLORS.primary} />
    },
    {
      id: 'heavy_bleeding',
      name: 'Heavy Bleeding',
      description: 'Excessive vaginal bleeding, more than a normal period',
      icon: <BloodDrop width={24} height={24} color={COLORS.primary} />
    },
    {
      id: 'bloody_discharge',
      name: 'Vaginal Discharge with Blood',
      description: 'Vaginal discharge that contains visible blood',
      icon: <BloodDrop width={24} height={24} color={COLORS.primary} />
    },
    {
      id: 'water_breaking',
      name: 'Water Breaking',
      description: 'Rupture of amniotic sac causing fluid release',
      icon: <FontAwesome5 name="tint" size={24} color={COLORS.primary} />
    },
    {
      id: 'foul_discharge',
      name: 'Foul Smelling Discharge',
      description: 'Vaginal discharge with an unusual or unpleasant odor',
      icon: <Bacteria width={24} height={24} color={COLORS.primary} />
    },
    {
      id: 'swollen_hands_feet',
      name: 'Swollen Hands or Feet',
      description: 'Visible swelling or puffiness in hands, feet, or ankles',
      icon: <Person width={24} height={24} color={COLORS.primary} />
    },
    {
      id: 'preterm_labor',
      name: 'Labor Before 9 Months',
      description: 'Labor that begins before the 37th week of pregnancy',
      icon: <Pregnant width={24} height={24} color={COLORS.primary} />
    },
    {
      id: 'weakness',
      name: 'Weak or Tired',
      description: 'Feeling unusually weak, fatigued, or lacking energy',
      icon: <FontAwesome5 name="tired" size={24} color={COLORS.primary} />
    },
    {
      id: 'fever',
      name: 'Fever',
      description: 'Body temperature higher than normal (above 38°C/100.4°F)',
      icon: <Fever width={24} height={24} color={COLORS.primary} />
    },
    {
      id: 'unconsciousness',
      name: 'Loss of Consciousness',
      description: 'Fainting or being unresponsive to stimulation',
      icon: <FontAwesome5 name="dizzy" size={24} color={COLORS.primary} />
    },
    {
      id: 'high_bp',
      name: 'High Blood Pressure',
      description: 'Blood pressure reading above normal ranges',
      icon: <FontAwesome5 name="heartbeat" size={24} color={COLORS.primary} />
    }
  ];

  // Get symptoms for the active region
  const getRegionSymptoms = () => {
    if (!activeRegion) return [];
    
    const regionSymptomIds = bodyRegions[activeRegion].symptoms || [];
    return SYMPTOMS.filter(symptom => regionSymptomIds.includes(symptom.id));
  };

  // Toggle symptom selection
  const toggleSymptom = (symptomId: string) => {
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

  // Get symptom name by ID
  const getSymptomName = (id: string) => {
    return SYMPTOMS.find(s => s.id === id)?.name || id;
  };

  // Get symptom icon by ID
  const getSymptomIcon = (id: string) => {
    return SYMPTOMS.find(s => s.id === id)?.icon;
  };

  // Handle body region selection
  const selectRegion = (region: BodyRegionKey) => {
    setActiveRegion(region);
    setSymptomsModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Test: Body Symptom Selector</Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Instruction */}
          <Text style={styles.instruction}>Tap on the body to select symptoms</Text>
          
          {/* Body Selector with the pregnant woman image */}
          <View style={[styles.bodyContainer, { width: bodySize.width, height: bodySize.height }]}>
            <Image
              source={require('../../assets/pregnant-woman.png')}
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
              onPress={() => selectRegion('head')}
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
              onPress={() => selectRegion('abdomen')}
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
              onPress={() => selectRegion('pelvis')}
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
              onPress={() => selectRegion('limbs')}
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
            onPress={() => selectRegion('general')}
          >
            <Text style={[
              styles.generalButtonText,
              hasSelectedInRegion('general') && styles.activeGeneralText
            ]}>
              General Symptoms
            </Text>
          </TouchableOpacity>
          
          {/* Selected Symptoms Summary */}
          <View style={styles.selectedSummary}>
            <Text style={styles.summaryTitle}>
              Selected Symptoms ({selectedSymptoms.length})
            </Text>
            {selectedSymptoms.length === 0 ? (
              <Text style={styles.noSymptomsText}>
                No symptoms selected. Tap on the body to select symptoms.
              </Text>
            ) : (
              <View style={styles.symptomsChipContainer}>
                {selectedSymptoms.map(id => {
                  const symptom = SYMPTOMS.find(s => s.id === id);
                  return (
                    <View key={id} style={styles.symptomChip}>
                      <View style={styles.chipIcon}>
                        {getSymptomIcon(id)}
                      </View>
                      <Text style={styles.symptomChipText}>{getSymptomName(id)}</Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => toggleSymptom(id)}
                      >
                        <FontAwesome5 name="times" size={12} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          
          {/* Submit Button (for testing) */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              selectedSymptoms.length === 0 && styles.disabledButton
            ]}
            disabled={selectedSymptoms.length === 0}
            onPress={() => console.log('Selected symptoms:', selectedSymptoms)}
          >
            <Text style={styles.submitButtonText}>Submit (Test)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Symptoms Selection Modal */}
      <Modal
        visible={symptomsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSymptomsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeRegion ? bodyRegions[activeRegion].name : ''} Symptoms
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSymptomsModalVisible(false)}
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
                  onPress={() => toggleSymptom(item.id)}
                >
                  <View style={styles.symptomInfo}>
                    <View style={styles.symptomIcon}>
                      {item.icon}
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
              onPress={() => setSymptomsModalVisible(false)}
            >
              <Text style={styles.buttonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    padding: 16,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  instruction: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: COLORS.dark,
  },
  // Body container and image
  bodyContainer: {
    // Dimensions set dynamically in the component
    position: 'relative',
    marginBottom: 24,
  },
  bodyImage: {
    width: '100%',
    height: '100%',
  },
  // Touchable regions
  touchRegion: {
    position: 'absolute',
    borderWidth: 1,
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
    top: '11%',
    left: '32%',
    width: '36%',
    height: '17%',
    borderRadius: 50,
  },
  abdomenRegion: {
    top: '30%',
    left: '22%',
    width: '56%',
    height: '14%',
    borderRadius: 15,
  },
  pelvisRegion: {
    top: '47%',
    left: '27%',
    width: '46%',
    height: '10%',
    borderRadius: 15,
  },
  limbsRegion: {
    top: '74%',
    left: '12%',
    width: '76%',
    height: '12%',
    borderRadius: 15,
  },
  // General symptoms button
  generalButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    elevation: 2,
    marginBottom: 24,
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
  selectedSummary: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    width: '100%',
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
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  closeButton: {
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
    marginTop: 16,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default TestSymptomSelector;