/**
 * 排班系統類型定義
 * 支援取貨制（甜點店）和預約制（美業/美髮）
 */

// 業態類型
export type BusinessType = 'pickup' | 'appointment';

// 星期
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// 基本營業時間設定
export interface DaySchedule {
  enabled: boolean;
  openTime: string;  // HH:mm 格式
  closeTime: string; // HH:mm 格式
}

// 時段（預約制使用）
export interface TimeSlot {
  start: string;  // HH:mm 格式
  end: string;    // HH:mm 格式
  booked: boolean;
  orderId?: string; // 如果已預約，關聯的訂單 ID
}

// 預約制的單日排班
export interface AppointmentDaySchedule extends DaySchedule {
  timeSlots: TimeSlot[];
}

// 每週排班（取貨制）
export interface PickupWeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

// 每週排班（預約制）
export interface AppointmentWeeklySchedule {
  monday: AppointmentDaySchedule;
  tuesday: AppointmentDaySchedule;
  wednesday: AppointmentDaySchedule;
  thursday: AppointmentDaySchedule;
  friday: AppointmentDaySchedule;
  saturday: AppointmentDaySchedule;
  sunday: AppointmentDaySchedule;
}

// 特殊日期設定
export interface SpecialDate {
  date: string; // YYYY-MM-DD 格式
  enabled: boolean;
  openTime?: string;
  closeTime?: string;
  reason?: string; // 例如：「店休」、「特殊營業時間」
}

// 取貨制排班
export interface PickupSchedule {
  businessType: 'pickup';
  weeklySchedule: PickupWeeklySchedule;
  specialDates: SpecialDate[];
}

// 預約制排班
export interface AppointmentSchedule {
  businessType: 'appointment';
  slotDuration: number; // 分鐘數：30, 60, 90
  weeklySchedule: AppointmentWeeklySchedule;
  specialDates: SpecialDate[];
}

// 排班（聯合類型）
export type Schedule = PickupSchedule | AppointmentSchedule;

// 排班狀態
export interface ScheduleState {
  schedule: Schedule | null;
  isConfigured: boolean;
  setSchedule: (schedule: Schedule) => void;
  setBusinessType: (type: BusinessType) => void;
  updateWeeklySchedule: (day: Weekday, schedule: DaySchedule | AppointmentDaySchedule) => void;
  addSpecialDate: (specialDate: SpecialDate) => void;
  removeSpecialDate: (date: string) => void;
  reset: () => void;
}

// 日曆標記類型
export interface CalendarMarking {
  marked?: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
  disabled?: boolean;
  disableTouchEvent?: boolean;
  customStyles?: {
    container?: any;
    text?: any;
  };
}

