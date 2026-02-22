import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { getSettings, saveSettings } from '../utils/storage';
import { scheduleAllReminders } from '../utils/notifications';
import { getAllPayments } from '../utils/storage';
import { loadLanguage, saveLanguage } from '../i18n/i18n';
import i18n from '../i18n/i18n';

const ITEM_HEIGHT = 30;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function DrumRollPicker({ values, selectedValue, onValueChange, formatValue }) {
  const listRef = useRef(null);
  const currentIndex = Math.max(0, values.indexOf(selectedValue));

  // Pad top and bottom so first/last item can center
  const paddedValues = [null, null, ...values, null, null];
  // Initial scroll offset so selectedValue is in the center slot
  const initialOffset = currentIndex * ITEM_HEIGHT;

  const onMomentumScrollEnd = useCallback(
    (e) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const valueIndex = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(values.length - 1, valueIndex));
      onValueChange(values[clamped]);
    },
    [values, onValueChange]
  );

  const getItemLayout = useCallback(
    (_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }),
    []
  );

  const renderItem = useCallback(
    ({ item }) => {
      const isSelected = item !== null && item === selectedValue;
      if (item === null) {
        return <View style={{ height: ITEM_HEIGHT }} />;
      }
      const formatted = formatValue ? formatValue(item) : String(item).padStart(2, '0');
      return (
        <TouchableOpacity style={pickerStyles.item} onPress={() => onValueChange(item)} activeOpacity={0.7}>
          <Text style={[pickerStyles.itemText, isSelected && pickerStyles.itemTextSelected]}>
            {formatted}
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedValue, formatValue]
  );

  return (
    <View style={pickerStyles.wrapper}>
      <FlatList
        ref={listRef}
        data={paddedValues}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        nestedScrollEnabled={true}
        contentOffset={{ x: 0, y: initialOffset }}
        style={{ height: PICKER_HEIGHT }}
        onScrollToIndexFailed={() => {}}
      />
      {/* Selection highlight overlay — rendered after FlatList to sit on top */}
      <View style={pickerStyles.selectionBox} pointerEvents="none" />
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrapper: {
    width: 52,
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  selectionBox: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: '#C0392B22',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#C0392B',
    borderRadius: 8,
    zIndex: 10,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '400',
  },
  itemTextSelected: {
    fontSize: 18,
    color: '#C0392B',
    fontWeight: '700',
  },
});

export default function SettingsScreen({ navigation }) {
  const { t } = useTranslation();

  const [daysBefore, setDaysBefore] = useState(1);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [language, setLanguage] = useState('tr');

  useEffect(() => {
    getSettings().then((s) => {
      setDaysBefore(s.notifyDaysBefore);
      setHour(s.notifyHour);
      setMinute(s.notifyMinute);
    });
    loadLanguage().then(setLanguage);
  }, []);

  const handleLanguageChange = async (lang) => {
    setLanguage(lang);
    await saveLanguage(lang);
    await i18n.changeLanguage(lang);
  };

  const handleSave = async () => {
    await saveSettings({
      notifyDaysBefore: daysBefore,
      notifyHour: hour,
      notifyMinute: minute,
    });
    const all = await getAllPayments();
    const unpaid = all.filter((p) => !p.isPaid);
    await scheduleAllReminders(unpaid);
    Alert.alert(t('settings.savedTitle'), t('settings.savedMsg'), [
      { text: t('addEdit.ok'), onPress: () => navigation.goBack() },
    ]);
  };

  const daysOptions = [0, 1, 2, 3, 5, 7];
  const allHours = Array.from({ length: 24 }, (_, i) => i);
  const allMinutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{t('settings.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Language */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.languageSection')}</Text>
        <View style={styles.optionRow}>
          {[
            { code: 'tr', label: 'TR Turkce' },
            { code: 'en', label: 'EN English' },
          ].map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.chip, language === lang.code && styles.chipActive]}
              onPress={() => handleLanguageChange(lang.code)}
            >
              <Text style={[styles.chipText, language === lang.code && styles.chipTextActive]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notification section header */}
      <View style={styles.sectionHeaderBar}>
        <Text style={styles.sectionHeaderText}>{t('settings.notificationSection')}</Text>
      </View>

      {/* Days Before + Time — yan yana */}
      <View style={styles.section}>
        <View style={styles.notifRow}>
          {/* Sol: gün seçimi */}
          <View style={styles.notifLeft}>
            <Text style={styles.sectionTitle}>{t('settings.daysBefore')}</Text>
            <Text style={styles.sectionDesc}>{t('settings.daysBeforeDesc')}</Text>
            <View style={styles.optionRow}>
              {daysOptions.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, daysBefore === d && styles.chipActive]}
                  onPress={() => setDaysBefore(d)}
                >
                  <Text style={[styles.chipText, daysBefore === d && styles.chipTextActive]}>
                    {d === 0 ? t('settings.sameDay') : `${d} ${t('settings.daysUnit')}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {/* Sağ: saat picker */}
          <View style={styles.notifRight}>
            <Text style={styles.sectionTitle}>{t('settings.hour')}</Text>
            <Text style={styles.sectionDesc}>{t('settings.hourDesc')}</Text>
            <View style={styles.drumRow}>
              <DrumRollPicker
                values={allHours}
                selectedValue={hour}
                onValueChange={setHour}
                formatValue={(v) => String(v).padStart(2, '0')}
              />
              <Text style={styles.drumColon}>:</Text>
              <DrumRollPicker
                values={allMinutes}
                selectedValue={minute}
                onValueChange={setMinute}
                formatValue={(v) => String(v).padStart(2, '0')}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Preview */}
      <View style={styles.preview}>
        <Text style={styles.previewLabel}>{t('settings.previewLabel')}</Text>
        <Text style={styles.previewText}>
          {daysBefore === 0
            ? t('settings.previewTextSameDay', {
                time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
              })
            : t('settings.previewText', {
                days: daysBefore,
                time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
              })}
        </Text>
      </View>

      {/* Save */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
        <Text style={styles.saveButtonText}>{t('settings.save')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingBottom: 40 },
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
  backBtn: { width: 80 },
  backText: { color: '#C0392B', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#2C3E50', fontSize: 18, fontWeight: 'bold' },
  sectionHeaderBar: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ECF0F1',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#D5DBDB',
  },
  sectionHeaderText: {
    color: '#7F8C8D',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { color: '#2C3E50', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  sectionDesc: { color: '#7F8C8D', fontSize: 12, marginBottom: 12 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notifLeft: {
    flex: 1,
  },
  notifRight: {
    alignItems: 'center',
  },
  drumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    alignSelf: 'center',
  },
  drumColon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C0392B',
    marginHorizontal: 4,
    marginTop: -2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#BDC3C7',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { borderColor: '#C0392B', backgroundColor: '#C0392B' },
  chipText: { color: '#2C3E50', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  preview: {
    marginHorizontal: 16,
    marginTop: 28,
    padding: 16,
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F5C518',
  },
  previewLabel: { color: '#856404', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  previewText: { color: '#533F03', fontSize: 14, lineHeight: 20 },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 28,
    backgroundColor: '#C0392B',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 3,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});