import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getSettings } from './storage';
import i18n from '../i18n/i18n';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForNotifications = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('payments', {
      name: i18n.t('notifications.channelName'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } else {
    console.log('Notifications require a physical device');
    return false;
  }
};

export const schedulePaymentReminder = async (payment) => {
  const settings = await getSettings();
  const { day, month, year, amount, who, type } = payment;

  // Calculate reminder date based on settings
  const paymentDate = new Date(year, month - 1, day);
  const reminderDate = new Date(paymentDate);
  reminderDate.setDate(reminderDate.getDate() - settings.notifyDaysBefore);
  reminderDate.setHours(settings.notifyHour, settings.notifyMinute, 0, 0);

  const now = new Date();
  if (reminderDate <= now) return null;

  const dayLabel =
    settings.notifyDaysBefore === 1
      ? i18n.t('notifications.tomorrow')
      : i18n.t('notifications.inDays', { days: settings.notifyDaysBefore });

  try {
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.title'),
        body: i18n.t('notifications.body', { label: dayLabel, who, type, amount: formatAmountTR(amount) }),
        data: { paymentId: payment.id },
        channelId: 'payments',
      },
      trigger: {
        type: 'date',
        date: reminderDate,
      },
    });
    return notifId;
  } catch (e) {
    console.error('Error scheduling notification:', e);
    return null;
  }
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const scheduleAllReminders = async (payments) => {
  await cancelAllNotifications();
  for (const payment of payments) {
    if (!payment.isPaid) {
      await schedulePaymentReminder(payment);
    }
  }
};

const formatAmountTR = (num) => {
  if (num == null) return '0';
  const parts = Number(num).toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  // Remove trailing zeros after decimal
  let decimal = parts[1];
  if (decimal === '00') return parts[0];
  if (decimal.endsWith('0')) decimal = decimal.slice(0, 1);
  return parts[0] + ',' + decimal;
};
