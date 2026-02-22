import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  saveRecurringTemplate,
  updateRecurringTemplate,
  updatePayment,
  generateId,
} from '../utils/storage';

export default function AddEditPaymentScreen({ route, navigation }) {
  const { t } = useTranslation();

  const PAYMENT_TYPES = [
    { label: t('addEdit.types.kk'), value: 'kk' },
    { label: t('addEdit.types.okul'), value: 'okul' },
    { label: t('addEdit.types.dershane'), value: 'dershane' },
    { label: t('addEdit.types.sirketPrim'), value: 'şirket prim' },
    { label: t('addEdit.types.siteAidat'), value: 'site aidat' },
    { label: t('addEdit.types.diger'), value: 'diğer' },
  ];

  const params = route.params || {};
  const editMode = params.editMode || false;
  const existingPayment = params.payment || null;

  const now = new Date();
  const defaultMonth = params.month || now.getMonth() + 1;
  const defaultYear = params.year || now.getFullYear();

  const [amount, setAmount] = useState(
    existingPayment ? String(existingPayment.amount) : ''
  );
  const [who, setWho] = useState(existingPayment ? existingPayment.who : '');
  const [type, setType] = useState(
    existingPayment ? existingPayment.type : 'kk'
  );
  const [customType, setCustomType] = useState('');
  const [day, setDay] = useState(
    existingPayment ? String(existingPayment.day) : ''
  );
  const [notes, setNotes] = useState(
    existingPayment ? existingPayment.notes || '' : ''
  );

  const validate = () => {
    if (!amount || isNaN(parseFloat(amount.replace(',', '.')))) {
      Alert.alert(t('addEdit.error'), t('addEdit.errorAmount'));
      return false;
    }
    if (!who.trim()) {
      Alert.alert(t('addEdit.error'), t('addEdit.errorWho'));
      return false;
    }
    if (!day || isNaN(parseInt(day)) || parseInt(day) < 1 || parseInt(day) > 31) {
      Alert.alert(t('addEdit.error'), t('addEdit.errorDay'));
      return false;
    }
    const finalType = type === 'diğer' ? customType.trim() : type;
    if (!finalType) {
      Alert.alert(t('addEdit.error'), t('addEdit.errorType'));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    const parsedDay = parseInt(day);
    const finalType = type === 'diğer' ? customType.trim() : type;

    if (editMode && existingPayment) {
      // Update existing monthly payment
      const updated = {
        ...existingPayment,
        amount: parsedAmount,
        who: who.trim(),
        type: finalType,
        day: parsedDay,
        notes: notes.trim(),
      };
      await updatePayment(updated);
      // Also update the recurring template so future months reflect the change
      if (existingPayment.templateId) {
        await updateRecurringTemplate({
          id: existingPayment.templateId,
          amount: parsedAmount,
          who: who.trim(),
          type: finalType,
          day: parsedDay,
          notes: notes.trim(),
        });
      }
      Alert.alert(t('addEdit.successTitle'), t('addEdit.successEdit'), [
        { text: t('addEdit.ok'), onPress: () => navigation.goBack() },
      ]);
    } else {
      // Save as recurring template — auto-appears every month
      const now = new Date();
      await saveRecurringTemplate({
        id: generateId(),
        amount: parsedAmount,
        who: who.trim(),
        type: finalType,
        day: parsedDay,
        notes: notes.trim(),
        startMonth: now.getMonth() + 1,
        startYear: now.getFullYear(),
      });
      Alert.alert(t('addEdit.successTitle'), t('addEdit.successNew'), [
        { text: t('addEdit.ok'), onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>{t('addEdit.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editMode ? t('addEdit.editTitle') : t('addEdit.newTitle')}
          </Text>
          <View style={styles.backBtn} />
        </View>

        {/* Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('addEdit.amount')}</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder={t('addEdit.amountPlaceholder')}
            placeholderTextColor="#BDC3C7"
            keyboardType="decimal-pad"
          />
        </View>

        {/* Who */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('addEdit.who')}</Text>
          <TextInput
            style={styles.input}
            value={who}
            onChangeText={setWho}
            placeholder={t('addEdit.whoPlaceholder')}
            placeholderTextColor="#BDC3C7"
            autoCapitalize="none"
          />
        </View>

        {/* Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('addEdit.type')}</Text>
          <View style={styles.typeGrid}>
            {PAYMENT_TYPES.map((pt) => (
              <TouchableOpacity
                key={pt.value}
                style={[
                  styles.typeChip,
                  type === pt.value && styles.typeChipActive,
                ]}
                onPress={() => setType(pt.value)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    type === pt.value && styles.typeChipTextActive,
                  ]}
                >
                  {pt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {type === 'diğer' && (
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              value={customType}
              onChangeText={setCustomType}
              placeholder={t('addEdit.customTypePlaceholder')}
              placeholderTextColor="#BDC3C7"
            />
          )}
        </View>

        {/* Day */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('addEdit.day')}</Text>
          <TextInput
            style={styles.input}
            value={day}
            onChangeText={setDay}
            placeholder="1 - 31"
            placeholderTextColor="#BDC3C7"
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('addEdit.notes')}</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('addEdit.notesPlaceholder')}
            placeholderTextColor="#BDC3C7"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {editMode ? t('addEdit.update') : t('addEdit.save')}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 48,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
  },
  backBtn: {
    width: 80,
  },
  backText: {
    color: '#C0392B',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#2C3E50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Input groups
  inputGroup: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  label: {
    color: '#2C3E50',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C3E50',
  },
  notesInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  // Type chips
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
  },
  typeChipActive: {
    backgroundColor: '#C0392B',
    borderColor: '#C0392B',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  // Recurring section
  recurringSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sectionTitle: {
    color: '#C0392B',
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 4,
  },
  // Month picker
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 10,
    paddingVertical: 10,
  },
  monthArrow: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  monthArrowText: {
    color: '#C0392B',
    fontSize: 18,
    fontWeight: 'bold',
  },
  monthPickerText: {
    color: '#2C3E50',
    fontSize: 16,
    fontWeight: '600',
    minWidth: 140,
    textAlign: 'center',
  },
  // Repeat
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  repeatChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatChipActive: {
    backgroundColor: '#2C3E50',
    borderColor: '#2C3E50',
  },
  repeatChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  repeatChipTextActive: {
    color: '#FFFFFF',
  },
  repeatInput: {
    width: 50,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: 'bold',
  },
  repeatInfo: {
    color: '#7F8C8D',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Save button
  saveButton: {
    marginHorizontal: 16,
    marginTop: 28,
    backgroundColor: '#C0392B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#C0392B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
