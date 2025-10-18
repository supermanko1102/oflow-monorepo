import {
  Schedule,
  PickupSchedule,
  AppointmentSchedule,
  TimeSlot,
} from '@/types/schedule';

/**
 * 生成時段
 * @param openTime 開始時間 (HH:mm)
 * @param closeTime 結束時間 (HH:mm)
 * @param duration 時段長度（分鐘）
 * @returns TimeSlot[]
 */
function generateTimeSlots(openTime: string, closeTime: string, duration: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);
  
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;
  
  for (let minutes = openMinutes; minutes < closeMinutes; minutes += duration) {
    const startHour = Math.floor(minutes / 60);
    const startMin = minutes % 60;
    const endMinutes = minutes + duration;
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    
    slots.push({
      start: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
      end: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
      booked: false,
    });
  }
  
  return slots;
}

/**
 * 甜點店排班範例（取貨制）
 */
export const mockPickupSchedule: PickupSchedule = {
  businessType: 'pickup',
  weeklySchedule: {
    monday: { enabled: true, openTime: '09:00', closeTime: '18:00' },
    tuesday: { enabled: true, openTime: '09:00', closeTime: '18:00' },
    wednesday: { enabled: true, openTime: '09:00', closeTime: '18:00' },
    thursday: { enabled: true, openTime: '09:00', closeTime: '18:00' },
    friday: { enabled: true, openTime: '09:00', closeTime: '18:00' },
    saturday: { enabled: true, openTime: '10:00', closeTime: '16:00' },
    sunday: { enabled: false, openTime: '09:00', closeTime: '18:00' },
  },
  specialDates: [
    {
      date: '2025-10-25',
      enabled: false,
      reason: '店休',
    },
    {
      date: '2025-11-01',
      enabled: false,
      reason: '國定假日',
    },
    {
      date: '2025-12-25',
      enabled: true,
      openTime: '10:00',
      closeTime: '15:00',
      reason: '聖誕節特殊營業',
    },
  ],
};

/**
 * 美髮店排班範例（預約制，60 分鐘時段）
 */
export const mockAppointmentSchedule: AppointmentSchedule = {
  businessType: 'appointment',
  slotDuration: 60,
  weeklySchedule: {
    monday: {
      enabled: true,
      openTime: '09:00',
      closeTime: '18:00',
      timeSlots: generateTimeSlots('09:00', '18:00', 60),
    },
    tuesday: {
      enabled: true,
      openTime: '09:00',
      closeTime: '18:00',
      timeSlots: generateTimeSlots('09:00', '18:00', 60),
    },
    wednesday: {
      enabled: true,
      openTime: '09:00',
      closeTime: '18:00',
      timeSlots: generateTimeSlots('09:00', '18:00', 60),
    },
    thursday: {
      enabled: true,
      openTime: '09:00',
      closeTime: '18:00',
      timeSlots: generateTimeSlots('09:00', '18:00', 60),
    },
    friday: {
      enabled: true,
      openTime: '09:00',
      closeTime: '18:00',
      timeSlots: generateTimeSlots('09:00', '18:00', 60),
    },
    saturday: {
      enabled: true,
      openTime: '10:00',
      closeTime: '17:00',
      timeSlots: generateTimeSlots('10:00', '17:00', 60),
    },
    sunday: {
      enabled: false,
      openTime: '09:00',
      closeTime: '18:00',
      timeSlots: [],
    },
  },
  specialDates: [
    {
      date: '2025-10-30',
      enabled: false,
      reason: '員工訓練日',
    },
  ],
};

/**
 * 美業店排班範例（預約制，90 分鐘時段）
 */
export const mockBeautySchedule: AppointmentSchedule = {
  businessType: 'appointment',
  slotDuration: 90,
  weeklySchedule: {
    monday: {
      enabled: true,
      openTime: '10:00',
      closeTime: '20:00',
      timeSlots: generateTimeSlots('10:00', '20:00', 90),
    },
    tuesday: {
      enabled: true,
      openTime: '10:00',
      closeTime: '20:00',
      timeSlots: generateTimeSlots('10:00', '20:00', 90),
    },
    wednesday: {
      enabled: true,
      openTime: '10:00',
      closeTime: '20:00',
      timeSlots: generateTimeSlots('10:00', '20:00', 90),
    },
    thursday: {
      enabled: true,
      openTime: '10:00',
      closeTime: '20:00',
      timeSlots: generateTimeSlots('10:00', '20:00', 90),
    },
    friday: {
      enabled: true,
      openTime: '10:00',
      closeTime: '22:00',
      timeSlots: generateTimeSlots('10:00', '22:00', 90),
    },
    saturday: {
      enabled: true,
      openTime: '10:00',
      closeTime: '22:00',
      timeSlots: generateTimeSlots('10:00', '22:00', 90),
    },
    sunday: {
      enabled: true,
      openTime: '11:00',
      closeTime: '19:00',
      timeSlots: generateTimeSlots('11:00', '19:00', 90),
    },
  },
  specialDates: [],
};

/**
 * 預設排班（甜點店取貨制）
 */
export const defaultSchedule: Schedule = mockPickupSchedule;

/**
 * 所有排班範例
 */
export const allMockSchedules = {
  pickup: mockPickupSchedule,
  hairSalon: mockAppointmentSchedule,
  beautySalon: mockBeautySchedule,
};

