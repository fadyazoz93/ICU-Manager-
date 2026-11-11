/**
 * Types for Waheed ICU Manager
 */

export type PatientStatus = 'Active' | 'Discharged';

export type DischargeStatus = 'DIS' | 'TRANS' | 'DAMA' | 'DIED';

export interface PatientRecord {
  id: string;
  medicalNo: string;
  patientName: string;
  status: PatientStatus;
  
  // Admission details
  admissionDate: string; // YYYY-MM-DD
  admissionTime: string; // HH:mm
  fromLocation: string;  // e.g. ER, OT, Ward, Cath Lab, Clinic
  diagnosis: string;
  pu?: string;           // Pressure ulcer / wounds stage or 'None'
  
  // Discharge details (optional until discharged)
  dischargeDate?: string; // YYYY-MM-DD
  dischargeTime?: string; // HH:mm
  dischargeStatus?: DischargeStatus | 'Trans'; // 'DIS' | 'Trans' | 'DAMA' | 'DIED'
  transferLocation?: string; // If transferred, destination e.g. CCU, General Ward, Hospital B
  dischargeReason?: string;
  
  // Computed
  lengthOfStay?: number; // Days in ICU
  createdAt?: string;
  updatedAt?: string;
}

export interface MonthlyRecordItem extends PatientRecord {
  reportDays: number;
}

export interface MonthlyReportData {
  month: string; // YYYY-MM
  admissions: number;
  discharges: number;
  totalDays: number;
  breakdown: {
    DIS: number;
    TRANS: number;
    DAMA: number;
    DIED: number;
  };
  records: MonthlyRecordItem[];
}

export interface DashboardMonthData {
  month: string; // YYYY-MM
  label: string; // e.g. "2026-01" or "Jan 2026"
  admissions: number;
  discharges: number;
  totalDays: number;
  breakdown: {
    DIS: number;
    TRANS: number;
    DAMA: number;
    DIED: number;
  };
}
