import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Schedule,
  ScheduleState,
  BusinessType,
  Weekday,
  DaySchedule,
  AppointmentDaySchedule,
  SpecialDate,
  PickupWeeklySchedule,
  AppointmentWeeklySchedule,
} from '@/types/schedule';
import { mockPickupSchedule } from '@/data/mockSchedule';

/**
 * 排班狀態管理 Store
 * 
 * 功能：
 * - 儲存排班設定
 * - 支援取貨制和預約制兩種業態
 * - 管理每週排班和特殊日期
 * - 持久化到 AsyncStorage
 */
export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      // 初始狀態：使用甜點店取貨制
      schedule: mockPickupSchedule,
      isConfigured: true,

      /**
       * 設定完整排班
       */
      setSchedule: (schedule: Schedule) => {
        set({
          schedule,
          isConfigured: true,
        });
      },

      /**
       * 切換業態類型
       * 注意：切換業態會重置排班設定
       */
      setBusinessType: (type: BusinessType) => {
        const currentSchedule = get().schedule;
        
        if (type === 'pickup') {
          // 切換到取貨制
          const newSchedule: Schedule = {
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
            specialDates: currentSchedule?.specialDates || [],
          };
          set({ schedule: newSchedule, isConfigured: false });
        } else {
          // 切換到預約制
          const newSchedule: Schedule = {
            businessType: 'appointment',
            slotDuration: 60,
            weeklySchedule: {
              monday: { enabled: true, openTime: '09:00', closeTime: '18:00', timeSlots: [] },
              tuesday: { enabled: true, openTime: '09:00', closeTime: '18:00', timeSlots: [] },
              wednesday: { enabled: true, openTime: '09:00', closeTime: '18:00', timeSlots: [] },
              thursday: { enabled: true, openTime: '09:00', closeTime: '18:00', timeSlots: [] },
              friday: { enabled: true, openTime: '09:00', closeTime: '18:00', timeSlots: [] },
              saturday: { enabled: true, openTime: '10:00', closeTime: '16:00', timeSlots: [] },
              sunday: { enabled: false, openTime: '09:00', closeTime: '18:00', timeSlots: [] },
            },
            specialDates: currentSchedule?.specialDates || [],
          };
          set({ schedule: newSchedule, isConfigured: false });
        }
      },

      /**
       * 更新單日排班
       */
      updateWeeklySchedule: (day: Weekday, daySchedule: DaySchedule | AppointmentDaySchedule) => {
        const currentSchedule = get().schedule;
        if (!currentSchedule) return;

        const updatedSchedule = {
          ...currentSchedule,
          weeklySchedule: {
            ...currentSchedule.weeklySchedule,
            [day]: daySchedule,
          },
        };

        set({ schedule: updatedSchedule as Schedule });
      },

      /**
       * 新增特殊日期
       */
      addSpecialDate: (specialDate: SpecialDate) => {
        const currentSchedule = get().schedule;
        if (!currentSchedule) return;

        // 檢查是否已存在相同日期
        const existingIndex = currentSchedule.specialDates.findIndex(
          (sd) => sd.date === specialDate.date
        );

        let updatedSpecialDates: SpecialDate[];
        if (existingIndex >= 0) {
          // 更新現有日期
          updatedSpecialDates = [...currentSchedule.specialDates];
          updatedSpecialDates[existingIndex] = specialDate;
        } else {
          // 新增日期
          updatedSpecialDates = [...currentSchedule.specialDates, specialDate];
        }

        set({
          schedule: {
            ...currentSchedule,
            specialDates: updatedSpecialDates,
          },
        });
      },

      /**
       * 移除特殊日期
       */
      removeSpecialDate: (date: string) => {
        const currentSchedule = get().schedule;
        if (!currentSchedule) return;

        set({
          schedule: {
            ...currentSchedule,
            specialDates: currentSchedule.specialDates.filter((sd) => sd.date !== date),
          },
        });
      },

      /**
       * 重置排班設定
       */
      reset: () => {
        set({
          schedule: null,
          isConfigured: false,
        });
      },
    }),
    {
      name: 'schedule-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

