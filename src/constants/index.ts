// src/constants/index.ts

// API configuration
//export const API_URL = 'http://10.0.2.2:3001';
export const API_URL = "https://umma-na-backend.onrender.com";


// Complication types
export const COMPLICATION_TYPES = [
  { 
    id: 'PPH', 
    name: 'Postpartum Hemorrhage (PPH)',
    description: 'Excessive bleeding after childbirth' 
  },
  { 
    id: 'eclampsia', 
    name: 'Eclampsia',
    description: 'Seizures during pregnancy/after childbirth' 
  },
  { 
    id: 'obstructed_labor', 
    name: 'Obstructed Labor',
    description: 'Baby cannot pass through the birth canal' 
  },
  { 
    id: 'normal_delivery', 
    name: 'Normal Delivery',
    description: 'Regular labor but requiring facility assistance' 
  },
  { 
    id: 'preterm_labor', 
    name: 'Preterm Labor',
    description: 'Labor occurring before 37 weeks of pregnancy' 
  },
  { 
    id: 'miscarriage', 
    name: 'Miscarriage',
    description: 'Loss of pregnancy before 20 weeks' 
  },
  { 
    id: 'sepsis', 
    name: 'Sepsis',
    description: 'Serious infection during pregnancy/after birth' 
  },
  { 
    id: 'unknown', 
    name: 'Unknown Emergency',
    description: 'Urgent situation requiring medical attention' 
  }
];

// Ride status definitions
export const RIDE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EN_ROUTE_TO_PICKUP: 'en_route_to_pickup',
  ARRIVED_AT_PICKUP: 'arrived_at_pickup',
  EN_ROUTE_TO_HOSPITAL: 'en_route_to_hospital',
  ARRIVED_AT_HOSPITAL: 'arrived_at_hospital',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Status display names for UI
export const STATUS_DISPLAY = {
  [RIDE_STATUS.PENDING]: 'Pending',
  [RIDE_STATUS.ACCEPTED]: 'Driver Accepted',
  [RIDE_STATUS.EN_ROUTE_TO_PICKUP]: 'Driver En Route',
  [RIDE_STATUS.ARRIVED_AT_PICKUP]: 'Driver Arrived',
  [RIDE_STATUS.EN_ROUTE_TO_HOSPITAL]: 'En Route to Hospital',
  [RIDE_STATUS.ARRIVED_AT_HOSPITAL]: 'Arrived at Hospital',
  [RIDE_STATUS.COMPLETED]: 'Completed',
  [RIDE_STATUS.CANCELLED]: 'Cancelled'
};

// Vehicle types
export const VEHICLE_TYPES = [
  { id: 'car', name: 'Car' },
  { id: 'motorcycle', name: 'Motorcycle' }
];

// Updated color scheme that matches the logo exactly
export const COLORS = {
  primary: '#5B3657',        // Deep purple/aubergine from logo background
  secondary: '#F5C2A3',      // Light peach/pink from main icon
  accent: '#E99D73',         // Darker peach from shadow/outline
  success: '#4CAF50',        // Keep existing green for success states
  danger: '#F44336',         // Keep existing red for error states
  warning: '#FFC107',        // Keep existing yellow for warnings
  info: '#2196F3',           // Keep existing blue for information
  light: '#F8F2EF',          // Light cream background (complements the peach)
  dark: '#3A2238',           // Darker shade of primary for text
  white: '#FFFFFF',          // White
  black: '#000000',          // Black
  gray: '#9E9E9E',           // Gray
  background: '#FFFAF7'      // Very light peach tinted background
};

// Phone number regex (Nigerian format)
export const PHONE_REGEX = /^0[789][01]\d{8}$/;