import { parseISO, format, getDay } from 'date-fns';
import {
  Schedule,
  Weekday,
  DaySchedule,
  AppointmentDaySchedule,
  TimeSlot,
  SpecialDate,
} from '@/types/schedule';

/**
 * 將 Date.getDay() 的數字轉換為 Weekday 類型
 * @param dayNumber 0 (週日) - 6 (週六)
 * @returns Weekday
 */
export function getDayOfWeek(dayNumber: number): Weekday {
  const days: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[dayNumber];
}

/**
 * 從日期字串獲取星期
 * @param dateString YYYY-MM-DD 格式
 * @returns Weekday
 */
export function getWeekdayFromDate(dateString: string): Weekday {
  const date = parseISO(dateString);
  const dayNumber = getDay(date);
  return getDayOfWeek(dayNumber);
}

/**
 * 檢查指定日期是否為營業日
 * @param dateString YYYY-MM-DD 格式
 * @param schedule 排班設定
 * @returns boolean
 */
export function isBusinessDay(dateString: string, schedule: Schedule | null): boolean {
  if (!schedule) return false;

  // 1. 檢查是否有特殊日期設定
  const specialDate = schedule.specialDates.find((sd) => sd.date === dateString);
  if (specialDate) {
    return specialDate.enabled;
  }

  // 2. 檢查每週排班
  const weekday = getWeekdayFromDate(dateString);
  const daySchedule = schedule.weeklySchedule[weekday];
  return daySchedule.enabled;
}

/**
 * 獲取指定日期的營業時間
 * @param dateString YYYY-MM-DD 格式
 * @param schedule 排班設定
 * @returns { open: string, close: string } | null
 */
export function getBusinessHours(
  dateString: string,
  schedule: Schedule | null
): { open: string; close: string } | null {
  if (!schedule) return null;

  // 1. 檢查特殊日期
  const specialDate = schedule.specialDates.find((sd) => sd.date === dateString);
  if (specialDate) {
    if (!specialDate.enabled) return null;
    if (specialDate.openTime && specialDate.closeTime) {
      return { open: specialDate.openTime, close: specialDate.closeTime };
    }
  }

  // 2. 檢查每週排班
  const weekday = getWeekdayFromDate(dateString);
  const daySchedule = schedule.weeklySchedule[weekday];
  
  if (!daySchedule.enabled) return null;
  
  return {
    open: daySchedule.openTime,
    close: daySchedule.closeTime,
  };
}

/**
 * 檢查指定時間是否在營業範圍內
 * @param dateString YYYY-MM-DD 格式
 * @param timeString HH:mm 格式
 * @param schedule 排班設定
 * @returns boolean
 */
export function isWithinBusinessHours(
  dateString: string,
  timeString: string,
  schedule: Schedule | null
): boolean {
  const businessHours = getBusinessHours(dateString, schedule);
  if (!businessHours) return false;

  const [hours, minutes] = timeString.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;

  const [openHours, openMinutes] = businessHours.open.split(':').map(Number);
  const openInMinutes = openHours * 60 + openMinutes;

  const [closeHours, closeMinutes] = businessHours.close.split(':').map(Number);
  const closeInMinutes = closeHours * 60 + closeMinutes;

  return timeInMinutes >= openInMinutes && timeInMinutes <= closeInMinutes;
}

/**
 * 獲取可用時段（僅適用於預約制）
 * @param dateString YYYY-MM-DD 格式
 * @param schedule 排班設定
 * @returns TimeSlot[]
 */
export function getAvailableSlots(dateString: string, schedule: Schedule | null): TimeSlot[] {
  if (!schedule || schedule.businessType !== 'appointment') return [];

  const weekday = getWeekdayFromDate(dateString);
  const daySchedule = schedule.weeklySchedule[weekday] as AppointmentDaySchedule;

  if (!daySchedule.enabled) return [];

  // 過濾出未預約的時段
  return daySchedule.timeSlots.filter((slot) => !slot.booked);
}

/**
 * 獲取所有時段（包含已預約和未預約）
 * @param dateString YYYY-MM-DD 格式
 * @param schedule 排班設定
 * @returns TimeSlot[]
 */
export function getAllSlots(dateString: string, schedule: Schedule | null): TimeSlot[] {
  if (!schedule || schedule.businessType !== 'appointment') return [];

  const weekday = getWeekdayFromDate(dateString);
  const daySchedule = schedule.weeklySchedule[weekday] as AppointmentDaySchedule;

  if (!daySchedule.enabled) return [];

  return daySchedule.timeSlots;
}

/**
 * 計算指定日期的忙碌程度（0-1）
 * @param dateString YYYY-MM-DD 格式
 * @param schedule 排班設定
 * @returns number (0 = 完全空閒, 1 = 完全滿)
 */
export function getBusinessLevel(dateString: string, schedule: Schedule | null): number {
  if (!schedule || schedule.businessType !== 'appointment') return 0;

  const allSlots = getAllSlots(dateString, schedule);
  if (allSlots.length === 0) return 0;

  const bookedSlots = allSlots.filter((slot) => slot.booked).length;
  return bookedSlots / allSlots.length;
}

/**
 * 獲取營業狀態描述
 * @param dateString YYYY-MM-DD 格式
 * @param schedule 排班設定
 * @returns string
 */
export function getBusinessStatus(dateString: string, schedule: Schedule | null): string {
  if (!schedule) return '未設定';

  if (!isBusinessDay(dateString, schedule)) {
    return '休息日';
  }

  const businessHours = getBusinessHours(dateString, schedule);
  if (!businessHours) return '休息日';

  if (schedule.businessType === 'pickup') {
    return `營業中 ${businessHours.open} - ${businessHours.close}`;
  }

  // 預約制
  const busyLevel = getBusinessLevel(dateString, schedule);
  const availableSlots = getAvailableSlots(dateString, schedule).length;
  const totalSlots = getAllSlots(dateString, schedule).length;

  if (busyLevel === 1) {
    return '已額滿';
  } else if (busyLevel >= 0.7) {
    return `即將額滿 (剩 ${availableSlots}/${totalSlots})`;
  } else {
    return `可預約 (${availableSlots}/${totalSlots})`;
  }
}

/**
 * 將 Weekday 轉換為中文
 * @param weekday Weekday
 * @returns string
 */
export function getWeekdayLabel(weekday: Weekday): string {
  const labels: Record<Weekday, string> = {
    monday: '週一',
    tuesday: '週二',
    wednesday: '週三',
    thursday: '週四',
    friday: '週五',
    saturday: '週六',
    sunday: '週日',
  };
  return labels[weekday];
}

/**
 * 生成時段（給預約制使用）
 * @param openTime HH:mm 格式
 * @param closeTime HH:mm 格式
 * @param duration 分鐘數
 * @returns TimeSlot[]
 */
export function generateTimeSlots(openTime: string, closeTime: string, duration: number): TimeSlot[] {
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
    
    if (endMinutes <= closeMinutes) {
      slots.push({
        start: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
        end: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
        booked: false,
      });
    }
  }
  
  return slots;
}

