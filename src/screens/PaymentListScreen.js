import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  getPaymentsForMonth,
  togglePaymentPaid,
  deletePayment,
  deleteRecurringTemplate,
  deleteAllFuturePaymentsByTemplate,
  resetMonthPayments,
} from '../utils/storage';
import { scheduleAllReminders } from '../utils/notifications';

const formatAmount = (num) => {
  if (num == null) return '0';
  const parts = Number(num).toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  let decimal = parts[1];
  if (decimal === '00') return parts[0];
  if (decimal.endsWith('0')) decimal = decimal.slice(0, 1);
  return parts[0] + ',' + decimal;
};

export default function PaymentListScreen({ navigation }) {
  const { t } = useTranslation();
  const months = t('months', { returnObjects: true });
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payments, setPayments] = useState([]);

  const loadPayments = useCallback(async () => {
    const data = await getPaymentsForMonth(month, year);
    setPayments(data);
    // Reschedule notifications for current/future unpaid payments
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    if (year > currentYear || (year === currentYear && month >= currentMonth)) {
      scheduleAllReminders(data);
    }
  }, [month, year]);

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [loadPayments])
  );

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleTogglePaid = async (id) => {
    await togglePaymentPaid(id);
    loadPayments();
  };

  const handleDelete = (payment) => {
    if (payment.templateId) {
      Alert.alert(
        t('deleteAlert.title'),
        `${payment.who} - ${payment.type}: ${formatAmount(payment.amount)} TL`,
        [
          { text: t('paymentList.cancel'), style: 'cancel' },
          {
            text: t('deleteAlert.onlyThisMonth'),
            onPress: async () => {
              await deletePayment(payment.id);
              loadPayments();
            },
          },
          {
            text: t('deleteAlert.deleteAll'),
            style: 'destructive',
            onPress: async () => {
              await deletePayment(payment.id);
              await deleteAllFuturePaymentsByTemplate(
                payment.templateId,
                month,
                year
              );
              await deleteRecurringTemplate(payment.templateId);
              loadPayments();
            },
          },
        ]
      );
    } else {
      Alert.alert(
        t('deleteAlert.title'),
        `${payment.who} - ${payment.type}: ${formatAmount(payment.amount)} TL ${t('deleteAlert.deleteConfirm')}`,
        [
          { text: t('paymentList.cancel'), style: 'cancel' },
          {
            text: t('paymentList.delete'),
            style: 'destructive',
            onPress: async () => {
              await deletePayment(payment.id);
              loadPayments();
            },
          },
        ]
      );
    }
  };

  const handleEdit = (payment) => {
    navigation.navigate('AddEdit', { payment, editMode: true });
  };

  const handleLongPress = (payment) => {
    Alert.alert(
      t('paymentList.actionTitle'),
      `${payment.who} - ${payment.type}: ${formatAmount(payment.amount)} TL`,
      [
        { text: t('paymentList.edit'), onPress: () => handleEdit(payment) },
        {
          text: payment.isPaid ? t('paymentList.markUnpaid') : t('paymentList.markPaid'),
          onPress: () => handleTogglePaid(payment.id),
        },
        {
          text: t('paymentList.delete'),
          style: 'destructive',
          onPress: () => handleDelete(payment),
        },
        { text: t('paymentList.cancel'), style: 'cancel' },
      ]
    );
  };

  const handleResetMonth = () => {
    Alert.alert(
      t('paymentList.resetTitle'),
      t('paymentList.resetMsg', { month: months[month - 1], year }),
      [
        { text: t('paymentList.cancel'), style: 'cancel' },
        {
          text: t('paymentList.resetBtn'),
          style: 'destructive',
          onPress: async () => {
            await resetMonthPayments(month, year);
            loadPayments();
          },
        },
      ]
    );
  };

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payments.reduce(
    (sum, p) => (p.isPaid ? sum + p.amount : sum),
    0
  );

  const renderPaymentRow = ({ item, index }) => {
    const rowTextColor = item.isPaid ? '#27AE60' : '#C0392B';
    const cellStyle = [styles.cell, { color: rowTextColor }];
    return (
      <TouchableOpacity
        style={[
          styles.row,
          index % 2 !== 0 && styles.rowAlt,
        ]}
        onPress={() => handleTogglePaid(item.id)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.statusCell}>
          <View style={[styles.statusBadge, item.isPaid ? styles.statusBadgePaid : styles.statusBadgeUnpaid]}>
            <Text style={styles.statusBadgeText}>{item.isPaid ? '✓' : '✗'}</Text>
          </View>
        </View>
        <Text style={[cellStyle, styles.amountCell]}>
          {formatAmount(item.amount)}
        </Text>
        <Text style={[cellStyle, styles.whoCell]}>{item.who}</Text>
        <Text style={[cellStyle, styles.typeCell]}>{item.type}</Text>
        <Text style={[cellStyle, styles.dayCell]}>{item.day}</Text>
        <Text style={[cellStyle, styles.noteCell]} numberOfLines={2}>
          {item.notes || ''}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
          <Text style={styles.arrowText}>◄</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleResetMonth}>
          <Text style={styles.monthText}>
            {months[month - 1]} {year}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
          <Text style={styles.arrowText}>►</Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleBar}>
        <Text style={styles.titleText}>{t('paymentList.title')}</Text>
        <View style={styles.titleRight}>
          <Text style={styles.countText}>{t('paymentList.records', { count: payments.length })}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsBtn}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Table Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.statusCell]} />
        <Text style={[styles.headerCell, styles.amountCell]}>{t('paymentList.cols.amount')}</Text>
        <Text style={[styles.headerCell, styles.whoCell]}>{t('paymentList.cols.who')}</Text>
        <Text style={[styles.headerCell, styles.typeCell]}>{t('paymentList.cols.type')}</Text>
        <Text style={[styles.headerCell, styles.dayCell]}>{t('paymentList.cols.day')}</Text>
        <Text style={[styles.headerCell, styles.noteCell]}>{t('paymentList.cols.notes')}</Text>
      </View>

      {/* Payment List */}
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={renderPaymentRow}
        contentContainerStyle={payments.length === 0 ? styles.emptyList : null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>{t('paymentList.emptyText')}</Text>
            <Text style={styles.emptySubtext}>
              {t('paymentList.emptySubtext')}
            </Text>
          </View>
        }
      />

      {/* Summary */}
      {payments.length > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('paymentList.summary.total')}</Text>
              <Text style={styles.summaryValue}>
                {formatAmount(totalAmount)} ₺
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('paymentList.summary.paid')}</Text>
              <Text style={[styles.summaryValue, styles.summaryPaid]}>
                {formatAmount(paidAmount)} ₺
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('paymentList.summary.remaining')}</Text>
              <Text style={[styles.summaryValue, styles.summaryUnpaid]}>
                {formatAmount(totalAmount - paidAmount)} ₺
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendRow}>
        <Text style={styles.legendInfo}>{t('paymentList.legend')}</Text>
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEdit', { month, year })}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  // Month Selector
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingTop: 48,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
  },
  arrowBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  arrowText: {
    color: '#C0392B',
    fontSize: 20,
    fontWeight: 'bold',
  },
  monthText: {
    color: '#2C3E50',
    fontSize: 20,
    fontWeight: 'bold',
    minWidth: 160,
    textAlign: 'center',
  },
  // Title Bar
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#C0392B',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  titleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countText: {
    color: '#FECACA',
    fontSize: 12,
  },
  settingsBtn: {
    padding: 2,
  },
  settingsIcon: {
    fontSize: 18,
  },
  // Table Header
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#2C3E50',
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  headerCell: {
    color: '#ECF0F1',
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'lowercase',
  },
  // Rows
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  rowAlt: {
    backgroundColor: '#F8F8F8',
  },
  statusCell: {
    width: '8%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgePaid: {
    backgroundColor: '#27AE60',
  },
  statusBadgeUnpaid: {
    backgroundColor: '#C0392B',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  cell: {
    fontSize: 13,
    paddingHorizontal: 2,
  },
  amountCell: {
    width: '17%',
    fontWeight: 'bold',
    fontSize: 13,
  },
  whoCell: {
    width: '14%',
    fontWeight: '600',
    fontSize: 13,
  },
  typeCell: {
    width: '18%',
    fontSize: 12,
  },
  dayCell: {
    width: '10%',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
  noteCell: {
    width: '33%',
    fontSize: 11,
  },
  // Empty state
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#7F8C8D',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#BDC3C7',
    fontSize: 13,
    marginTop: 6,
  },
  // Summary
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderTopColor: '#C0392B',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    color: '#7F8C8D',
    fontSize: 11,
    marginBottom: 2,
  },
  summaryValue: {
    color: '#2C3E50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  summaryPaid: {
    color: '#B7950B',
  },
  summaryUnpaid: {
    color: '#C0392B',
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
  },
  // Legend
  legendRow: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  legendInfo: {
    color: '#BDC3C7',
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#C0392B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '300',
    marginTop: -2,
  },
});
