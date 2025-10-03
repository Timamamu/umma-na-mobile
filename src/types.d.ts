// src/types.d.ts

export type Role = 'chips' | 'driver';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: Role;
  username?: string;
  isAvailable?: boolean; // Only drivers will have this
}

export interface CatchmentArea {
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

export interface Hospital {
  id: string;
  name: string;
  ward: string;
  lga: string;
  lat: number;
  lng: number;
  facilityType: string;
  capabilities: Record<string, boolean>;
}

export interface RideRequest {
  id: string;
  chipsAgentId: string;
  symptoms: string[]; // Array of symptom IDs
  complicationType: string; // The identified condition
  conditionName?: string; // Human-readable condition name
  pickupLocation: {
    lat: number;
    lng: number;
  };
  driverAssigned?: {
    id: string;
    name: string;
    phoneNumber: string;
    vehicleType: string;
    distanceToChips: number;
    estimatedPickupTimeMin: number;
  };
  hospitalAssigned?: {
    id: string;
    name: string;
    location: {
      lat: number;
      lng: number;
    };
    meetsIdeal: boolean;
    meetsAcceptable: boolean;
    timeToHospital: number;
    totalTripTime: number;
    score: number;
  };
  status: 'pending' | 'accepted' | 'en_route_to_pickup' | 'arrived_at_pickup' |
          'en_route_to_hospital' | 'arrived_at_hospital' | 'completed' | 'cancelled';
  createdAt: string | Date;
}

// Re-export the Symptom and SymptomCategory types from SYMPTOMS.ts
export interface Symptom {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface SymptomCategory {
  id: string;
  name: string;
  symptoms: Symptom[];
}