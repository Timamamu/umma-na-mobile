// src/constants/SYMPTOMS.ts
// This file contains symptom definitions for the UMMA-NA app

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
  
  // Define all symptoms
  export const SYMPTOMS: Symptom[] = [
    {
      id: "heavy_bleeding_after_delivery",
      name: "Heavy bleeding after delivery",
      description: "Patient is experiencing excessive bleeding after giving birth that seems abnormal or concerning.",
      category: "bleeding"
    },
    {
      id: "severe_headache",
      name: "Severe headache",
      description: "Patient is experiencing an intense, painful headache that may be persistent.",
      category: "pain"
    },
    {
      id: "blurry_vision",
      name: "Blurry vision",
      description: "Patient reports that their vision is unclear, foggy, or they are seeing spots.",
      category: "consciousness"
    },
    {
      id: "swollen_hands_feet",
      name: "Swollen hands or feet",
      description: "Patient has noticeable swelling in hands, feet, face, or other body parts.",
      category: "other"
    },
    {
      id: "convulsions",
      name: "Convulsions",
      description: "Patient is experiencing seizures or uncontrolled shaking movements.",
      category: "consciousness"
    },
    {
      id: "baby_not_coming",
      name: "Baby not coming out",
      description: "Patient is in labor but the baby is not progressing through the birth canal.",
      category: "labor"
    },
    {
      id: "prolonged_labor",
      name: "In labor for many hours",
      description: "Patient has been in active labor for more than 12 hours without progression.",
      category: "labor"
    },
    {
      id: "preterm_labor",
      name: "Labor before 9 months",
      description: "Patient is showing signs of labor before the pregnancy has reached full term (37 weeks).",
      category: "labor"
    },
    {
      id: "fever",
      name: "Fever",
      description: "Patient has an elevated body temperature, feels hot to touch, or reports feeling feverish.",
      category: "vitals"
    },
    {
      id: "foul_discharge",
      name: "Foul-smelling discharge",
      description: "Patient has vaginal discharge with an unusual or unpleasant odor.",
      category: "other"
    },
    {
      id: "unconsciousness",
      name: "Loss of consciousness",
      description: "Patient has fainted or cannot be awakened properly.",
      category: "consciousness"
    },
    {
      id: "vomiting",
      name: "Vomiting",
      description: "Patient is experiencing repeated vomiting that may lead to dehydration.",
      category: "other"
    },
    {
      id: "high_bp",
      name: "High blood pressure (if known)",
      description: "Patient has elevated blood pressure readings, if equipment is available to check.",
      category: "vitals"
    },
    {
      id: "no_fetal_movement",
      name: "No movement from baby",
      description: "Pregnant patient reports that the baby has not moved for an extended period.",
      category: "other"
    },
    {
      id: "abdominal_pain",
      name: "Sharp abdominal pain",
      description: "Patient is experiencing severe or sharp pain in the abdominal area.",
      category: "pain"
    },
    {
      id: "back_pain",
      name: "Lower back pain",
      description: "Patient is experiencing pain in the lower back that may come and go or be constant.",
      category: "pain"
    },
    {
      id: "bloody_discharge",
      name: "Vaginal discharge with blood or pus",
      description: "Patient has vaginal discharge containing blood, pus, or other concerning fluids.",
      category: "bleeding"
    },
    {
      id: "weakness",
      name: "Weak or tired",
      description: "Patient is experiencing unusual weakness, fatigue, or exhaustion.",
      category: "vitals"
    },
    {
      id: "painful_urination",
      name: "Painful urination",
      description: "Patient experiences pain or burning when urinating.",
      category: "pain"
    },
    {
      id: "water_breaking",
      name: "Water breaking",
      description: "Patient's amniotic fluid has released, either in a gush or a slow leak.",
      category: "labor"
    },
    {
      id: "baby_moving",
      name: "Baby moving",
      description: "Patient can feel the baby moving inside, which is usually a positive sign.",
      category: "other"
    },
    {
      id: "mucus_discharge",
      name: "Vaginal discharge with blood or mucus",
      description: "Patient has vaginal discharge that contains blood or mucus, which may be normal in some cases.",
      category: "other"
    }
  ];
  
  // Group symptoms by category
  export const SYMPTOM_CATEGORIES: SymptomCategory[] = [
    {
      id: "bleeding",
      name: "Bleeding",
      symptoms: SYMPTOMS.filter(s => s.category === "bleeding")
    },
    {
      id: "pain",
      name: "Pain & Discomfort",
      symptoms: SYMPTOMS.filter(s => s.category === "pain")
    },
    {
      id: "consciousness",
      name: "Consciousness & Vision",
      symptoms: SYMPTOMS.filter(s => s.category === "consciousness")
    },
    {
      id: "labor",
      name: "Labor & Delivery",
      symptoms: SYMPTOMS.filter(s => s.category === "labor")
    },
    {
      id: "vitals",
      name: "Vital Signs",
      symptoms: SYMPTOMS.filter(s => s.category === "vitals")
    },
    {
      id: "other",
      name: "Other Symptoms",
      symptoms: SYMPTOMS.filter(s => s.category === "other")
    }
  ];
  
  // Make sure to add this export to your index.ts in the constants folder
  // In constants/index.ts add:
  // export * from './SYMPTOMS';
  
  export default { SYMPTOMS, SYMPTOM_CATEGORIES };