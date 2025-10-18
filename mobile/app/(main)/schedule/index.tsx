import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Button, Chip, Portal, Modal } from 'react-native-paper';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { BusinessTypeSelector } from '@/components/schedule/BusinessTypeSelector';
import { SlotDurationPicker } from '@/components/schedule/SlotDurationPicker';
import { WeeklySchedule } from '@/components/schedule/WeeklySchedule';
import { MonthCalendar } from '@/components/schedule/MonthCalendar';
import { DayDetail } from '@/components/schedule/DayDetail';
import { BusinessType, Weekday, DaySchedule, AppointmentDaySchedule } from '@/types/schedule';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';

/**
 * 排班設定主頁
 * 
 * 流程：
 * 1. 選擇業態（取貨制/預約制）
 * 2. 設定時段長度（預約制）
 * 3. 設定每週排班
 * 4. 檢視月曆
 * 5. 管理特殊日期
 */
export default function ScheduleScreen() {
  const schedule = useScheduleStore((state) => state.schedule);
  const setSchedule = useScheduleStore((state) => state.setSchedule);
  const setBusinessType = useScheduleStore((state) => state.setBusinessType);
  const updateWeeklySchedule = useScheduleStore((state) => state.updateWeeklySchedule);
  const toast = useToast();
  const haptics = useHaptics();

  const [step, setStep] = useState<'type' | 'duration' | 'schedule' | 'calendar'>(
    schedule ? 'calendar' : 'type'
  );
  const [tempBusinessType, setTempBusinessType] = useState<BusinessType | null>(
    schedule?.businessType || null
  );
  const [tempSlotDuration, setTempSlotDuration] = useState<number>(60);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDayDetail, setShowDayDetail] = useState(false);

  // 步驟 1: 選擇業態
  const handleBusinessTypeSelect = (type: BusinessType) => {
    haptics.light();
    setTempBusinessType(type);
  };

  const handleBusinessTypeNext = () => {
    if (!tempBusinessType) {
      toast.warning('請選擇業態類型');
      return;
    }
    
    haptics.success();
    setBusinessType(tempBusinessType);
    
    if (tempBusinessType === 'appointment') {
      setStep('duration');
    } else {
      setStep('schedule');
    }
  };

  // 步驟 2: 選擇時段長度（預約制）
  const handleSlotDurationSelect = (duration: number) => {
    haptics.light();
    setTempSlotDuration(duration);
  };

  const handleSlotDurationNext = () => {
    haptics.success();
    if (schedule && schedule.businessType === 'appointment') {
      setSchedule({ ...schedule, slotDuration: tempSlotDuration });
    }
    setStep('schedule');
  };

  // 步驟 3: 設定每週排班
  const handleDayScheduleChange = (day: Weekday, daySchedule: DaySchedule | AppointmentDaySchedule) => {
    updateWeeklySchedule(day, daySchedule);
  };

  const handleScheduleNext = () => {
    haptics.success();
    toast.success('排班設定已儲存 ✅');
    setStep('calendar');
  };

  // 步驟 4: 月曆視圖
  const handleDayPress = (date: string) => {
    haptics.light();
    setSelectedDate(date);
    setShowDayDetail(true);
  };

  const handleCloseDayDetail = () => {
    setShowDayDetail(false);
    setSelectedDate(null);
  };

  // 切換到設定模式
  const handleEditSchedule = () => {
    haptics.light();
    setStep('schedule');
  };

  // 切換業態
  const handleChangeBusinessType = () => {
    haptics.light();
    setStep('type');
  };

  return (
    <View style={styles.container}>
      {/* 步驟指示器 */}
      {step !== 'calendar' && (
        <View style={styles.stepIndicator}>
          <View style={styles.stepDots}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            {tempBusinessType === 'appointment' && (
              <View style={[styles.stepDot, step !== 'type' && styles.stepDotActive]} />
            )}
            <View
              style={[styles.stepDot, step === 'schedule' && styles.stepDotActive]}
            />
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 步驟 1: 選擇業態 */}
        {step === 'type' && (
          <>
            <BusinessTypeSelector
              selectedType={tempBusinessType}
              onSelect={handleBusinessTypeSelect}
            />
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleBusinessTypeNext}
                disabled={!tempBusinessType}
                buttonColor="#00B900"
                contentStyle={styles.buttonContent}
              >
                下一步
              </Button>
            </View>
          </>
        )}

        {/* 步驟 2: 選擇時段長度（預約制） */}
        {step === 'duration' && (
          <>
            <SlotDurationPicker
              selectedDuration={tempSlotDuration}
              onSelect={handleSlotDurationSelect}
            />
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={() => setStep('type')}
                style={styles.backButton}
                textColor="#6B7280"
              >
                上一步
              </Button>
              <Button
                mode="contained"
                onPress={handleSlotDurationNext}
                buttonColor="#00B900"
                contentStyle={styles.buttonContent}
              >
                下一步
              </Button>
            </View>
          </>
        )}

        {/* 步驟 3: 設定每週排班 */}
        {step === 'schedule' && schedule && (
          <>
            <View style={styles.scheduleHeader}>
              <View>
                <Text style={styles.scheduleTitle}>設定營業時間</Text>
                <Text style={styles.scheduleSubtitle}>
                  {schedule.businessType === 'pickup' ? '取貨制' : '預約制'}
                  {schedule.businessType === 'appointment' &&
                    ` · ${schedule.slotDuration} 分鐘/時段`}
                </Text>
              </View>
              <Chip onPress={handleChangeBusinessType}>切換業態</Chip>
            </View>

            <WeeklySchedule
              businessType={schedule.businessType}
              weeklySchedule={schedule.weeklySchedule}
              onDayScheduleChange={handleDayScheduleChange}
              slotDuration={
                schedule.businessType === 'appointment' ? schedule.slotDuration : undefined
              }
            />

            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleScheduleNext}
                buttonColor="#00B900"
                contentStyle={styles.buttonContent}
              >
                完成設定
              </Button>
            </View>
          </>
        )}

        {/* 步驟 4: 月曆視圖 */}
        {step === 'calendar' && schedule && (
          <>
            <View style={styles.calendarHeader}>
              <View>
                <Text style={styles.calendarTitle}>排班總覽</Text>
                <Text style={styles.calendarSubtitle}>
                  {schedule.businessType === 'pickup' ? '取貨制' : '預約制'}
                  {schedule.businessType === 'appointment' &&
                    ` · ${schedule.slotDuration} 分鐘/時段`}
                </Text>
              </View>
            </View>

            <View style={styles.calendarContainer}>
              <MonthCalendar
                schedule={schedule}
                onDayPress={handleDayPress}
                selectedDate={selectedDate || undefined}
              />
            </View>

            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={handleEditSchedule}
                style={styles.actionButton}
                textColor="#00B900"
              >
                編輯排班
              </Button>
              <Button
                mode="outlined"
                onPress={handleChangeBusinessType}
                style={styles.actionButton}
                textColor="#00B900"
              >
                切換業態
              </Button>
            </View>
          </>
        )}
      </ScrollView>

      {/* 日期詳情 Modal */}
      <Portal>
        <Modal
          visible={showDayDetail}
          onDismiss={handleCloseDayDetail}
          contentContainerStyle={styles.modal}
        >
          {selectedDate && <DayDetail date={selectedDate} schedule={schedule} />}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  stepIndicator: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  stepDotActive: {
    backgroundColor: '#00B900',
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  backButton: {
    flex: 1,
    borderColor: '#D1D5DB',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  scheduleSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  calendarHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  calendarSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  calendarContainer: {
    paddingHorizontal: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    borderColor: '#00B900',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
  },
});

