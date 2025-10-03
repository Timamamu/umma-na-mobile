// services/api.ts
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants'; 

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

/**
 * Request emergency transport based on symptoms
 * 
 * @param chipsAgentId - The ID of the CHIPS agent making the request
 * @param symptoms - Array of symptom IDs the patient is experiencing 
 * @param pickupLat - Latitude of pickup location
 * @param pickupLng - Longitude of pickup location
 * @returns Promise with the ride request response
 */
export const requestRide = async (
  chipsAgentId: string, 
  symptoms: string[],
  pickupLat: number, 
  pickupLng: number 
): Promise<any> => {
  try {
    console.log('Sending ride request with:', { 
      chipsAgentId, 
      symptomCount: symptoms.length,
      symptoms,
      pickupLat, 
      pickupLng 
    });
    
    const response = await api.post('/request-ride', {
      chipsAgentId,
      symptoms,
      pickupLat,
      pickupLng
    });
    
    return response.data;
  } catch (error: unknown) {
    console.error('Request ride error:', error);
    throw error;
  }
};

// Authentication APIs
export const login = async (
  phoneNumber: string, 
  username: string, 
  role: 'chips' | 'driver'
): Promise<any> => {
  try {
    const response = await api.post('/auth/login', {
      phoneNumber,
      username,
      password: 'password', 
      role
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Login error:', error);
    throw error;
  }
};

// CHIPS Agent APIs
export const getChipsActiveRide = async (chipsAgentId: string): Promise<any> => {
  try {
    const response = await api.get(`/chips-active-ride/${chipsAgentId}`);
    return response.data;
  } catch (error: unknown) {
    console.error('Get active ride error:', error);
    throw error;
  }
};

export const getChipsRideHistory = async (chipsAgentId: string): Promise<any> => {
  try {
    const response = await api.get(`/chips-ride-history/${chipsAgentId}`);
    return response.data;
  } catch (error: unknown) {
    console.error('Get ride history error:', error);
    throw error;
  }
};

// Driver APIs
export const updateDriverLocation = async (
  driverId: string, 
  lat: number, 
  lng: number
): Promise<any> => {
  try {
    const response = await api.post('/update-driver-location', {
      driverId,
      lat,
      lng
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Update driver location error:', error);
    throw error;
  }
};

export const updateDriverAvailability = async (
  driverId: string, 
  isAvailable: boolean
): Promise<any> => {
  try {
    const response = await api.patch(`/update-ets-driver/${driverId}`, {
      isAvailable
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Update driver availability error:', error);
    throw error;
  }
};

export const getDriverActiveRide = async (driverId: string): Promise<any> => {
  try {
    if (!driverId) {
      console.error('getDriverActiveRide error: No driver ID provided');
      throw new Error('Driver ID is required');
    }
    
    console.log('Requesting active ride for driver:', driverId);
    const response = await api.get(`/driver-active-ride/${driverId}`);
    
    // Log the successful response for debugging
    console.log('Active ride API response status:', response.status);
    
    return response.data;
  } catch (error: unknown) {
    // Enhanced error logging
    console.error('Get driver active ride error:', error);
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', axiosError.response.data);
        console.error('Error response status:', axiosError.response.status);
        console.error('Error response headers:', axiosError.response.headers);
        
        // If the server sent a message, throw that
        if (axiosError.response.data && typeof axiosError.response.data === 'object' && 'message' in axiosError.response.data) {
          throw new Error(axiosError.response.data.message as string);
        }
      } else if (axiosError.request) {
        // The request was made but no response was received
        console.error('No response received from server');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', axiosError.message);
      }
    }
    
    throw error;
  }
};

export const getDriverRideHistory = async (driverId: string): Promise<any> => {
  try {
    const response = await api.get(`/driver-ride-history/${driverId}`);
    return response.data;
  } catch (error: unknown) {
    console.error('Get driver ride history error:', error);
    throw error;
  }
};

export const getDriverPendingRequests = async (driverId: string): Promise<any> => {
  try {
    if (!driverId) {
      console.error('getDriverPendingRequests error: No driver ID provided');
      throw new Error('Driver ID is required');
    }
    
    console.log('Requesting pending requests for driver:', driverId);
    const response = await api.get(`/driver-pending-requests/${driverId}`);
    return response.data;
  } catch (error: unknown) {
    console.error('Get pending requests error:', error);
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        console.error('Error response data:', axiosError.response.data);
        console.error('Error response status:', axiosError.response.status);
        
        if (axiosError.response.data && typeof axiosError.response.data === 'object' && 'message' in axiosError.response.data) {
          throw new Error(axiosError.response.data.message as string);
        }
      }
    }
    
    throw error;
  }
};

export const updateRideStatus = async (
  rideId: string, 
  status: string, 
  additionalData: Record<string, any> = {}
): Promise<any> => {
  try {
    if (!rideId) {
      console.error('updateRideStatus error: No ride ID provided');
      throw new Error('Ride ID is required');
    }
    
    console.log('Updating ride status:', { rideId, status, additionalData });
    const response = await api.patch(`/update-request/${rideId}`, {
      status,
      ...additionalData
    });
    
    console.log('Update status response:', response.status);
    return response.data;
  } catch (error: unknown) {
    console.error('Update ride status error:', error);
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        console.error('Error response data:', axiosError.response.data);
        console.error('Error response status:', axiosError.response.status);
        
        if (axiosError.response.data && typeof axiosError.response.data === 'object' && 'message' in axiosError.response.data) {
          throw new Error(axiosError.response.data.message as string);
        }
      }
    }
    
    throw error;
  }
};

export const getCatchmentAreas = async (): Promise<any> => {
  try {
    const response = await api.get('/catchment-areas');
    return response.data;
  } catch (error: unknown) {
    console.error('Get catchment areas error:', error);
    throw error;
  }
};

export const getHospitals = async (): Promise<any> => {
  try {
    const response = await api.get('/hospitals');
    return response.data;
  } catch (error: unknown) {
    console.error('Get hospitals error:', error);
    throw error;
  }
};

export default api;