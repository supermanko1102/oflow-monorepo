import { Reminder } from '@/types/order';
import { mockOrders } from './mockOrders';

export const mockReminders: Reminder[] = [
  {
    id: 'r1',
    orderId: '3',
    order: mockOrders[2], // 王小姐 - 10/19
    reminderType: 'today',
    reminderDate: '2025-10-19',
    isRead: false,
  },
  {
    id: 'r2',
    orderId: '1',
    order: mockOrders[0], // 陳小姐 - 10/20
    reminderType: 'today',
    reminderDate: '2025-10-20',
    isRead: false,
  },
  {
    id: 'r3',
    orderId: '2',
    order: mockOrders[1], // 林先生 - 10/21
    reminderType: '3days',
    reminderDate: '2025-10-21',
    isRead: true,
  },
  {
    id: 'r4',
    orderId: '4',
    order: mockOrders[3], // 張太太 - 10/25
    reminderType: '7days',
    reminderDate: '2025-10-25',
    isRead: false,
  },
];

