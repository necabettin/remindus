import AsyncStorage from '@react-native-async-storage/async-storage';

const PAYMENTS_KEY = '@payments_data';
const RECURRING_KEY = '@recurring_templates';
const SETTINGS_KEY = '@app_settings';

const DEFAULT_SETTINGS = {
  notifyDaysBefore: 1,  // kaç gün önce
  notifyHour: 9,        // saat (0-23)
  notifyMinute: 0,
};

export const getSettings = async () => {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings) => {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

export { generateId };

// ── Recurring Templates ───────────────────────────────────────────────────────

export const getRecurringTemplates = async () => {
  try {
    const data = await AsyncStorage.getItem(RECURRING_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading templates:', e);
    return [];
  }
};

export const saveRecurringTemplate = async (template) => {
  const all = await getRecurringTemplates();
  const newTemplate = { ...template, id: template.id || generateId() };
  all.push(newTemplate);
  await AsyncStorage.setItem(RECURRING_KEY, JSON.stringify(all));
  return newTemplate;
};

export const updateRecurringTemplate = async (partial) => {
  const all = await getRecurringTemplates();
  const index = all.findIndex((t) => t.id === partial.id);
  if (index !== -1) {
    all[index] = { ...all[index], ...partial };
    await AsyncStorage.setItem(RECURRING_KEY, JSON.stringify(all));
  }
};

export const deleteRecurringTemplate = async (id) => {
  const all = await getRecurringTemplates();
  const filtered = all.filter((t) => t.id !== id);
  await AsyncStorage.setItem(RECURRING_KEY, JSON.stringify(filtered));
};

// ── Monthly Payments ──────────────────────────────────────────────────────────

export const getAllPayments = async () => {
  try {
    const data = await AsyncStorage.getItem(PAYMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading payments:', e);
    return [];
  }
};

export const getPaymentsForMonth = async (month, year) => {
  const all = await getAllPayments();
  const monthPayments = all.filter((p) => p.month === month && p.year === year);

  // Auto-generate only for current month and future — never rewrite the past
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const isCurrentOrFuture =
    year > currentYear || (year === currentYear && month >= currentMonth);

  if (!isCurrentOrFuture) {
    return monthPayments.sort((a, b) => a.day - b.day);
  }

  // Auto-generate from recurring templates if not yet created for this month
  const templates = await getRecurringTemplates();
  const applicable = templates.filter((t) => {
    if (t.startYear < year) return true;
    if (t.startYear === year && t.startMonth <= month) return true;
    return false;
  });

  const existingTemplateIds = new Set(
    monthPayments.map((p) => p.templateId).filter(Boolean)
  );

  const newPayments = [];
  for (const t of applicable) {
    if (!existingTemplateIds.has(t.id)) {
      newPayments.push({
        id: generateId(),
        templateId: t.id,
        amount: t.amount,
        who: t.who,
        type: t.type,
        day: t.day,
        notes: t.notes,
        isPaid: false,
        month,
        year,
      });
    }
  }

  if (newPayments.length > 0) {
    await AsyncStorage.setItem(
      PAYMENTS_KEY,
      JSON.stringify([...all, ...newPayments])
    );
  }

  return [...monthPayments, ...newPayments].sort((a, b) => a.day - b.day);
};

export const updatePayment = async (updatedPayment) => {
  const all = await getAllPayments();
  const index = all.findIndex((p) => p.id === updatedPayment.id);
  if (index !== -1) {
    all[index] = updatedPayment;
    await AsyncStorage.setItem(PAYMENTS_KEY, JSON.stringify(all));
  }
};

export const deletePayment = async (id) => {
  const all = await getAllPayments();
  const filtered = all.filter((p) => p.id !== id);
  await AsyncStorage.setItem(PAYMENTS_KEY, JSON.stringify(filtered));
};

// Sil: bu aya ait tüm gelecek otomatik kopyaları da temizle
export const deleteAllFuturePaymentsByTemplate = async (
  templateId,
  fromMonth,
  fromYear
) => {
  const all = await getAllPayments();
  const filtered = all.filter((p) => {
    if (p.templateId !== templateId) return true;
    if (p.year > fromYear) return false;
    if (p.year === fromYear && p.month >= fromMonth) return false;
    return true;
  });
  await AsyncStorage.setItem(PAYMENTS_KEY, JSON.stringify(filtered));
};

export const togglePaymentPaid = async (id) => {
  const all = await getAllPayments();
  const index = all.findIndex((p) => p.id === id);
  if (index !== -1) {
    all[index].isPaid = !all[index].isPaid;
    await AsyncStorage.setItem(PAYMENTS_KEY, JSON.stringify(all));
    return all[index];
  }
  return null;
};

export const resetMonthPayments = async (month, year) => {
  const all = await getAllPayments();
  const updated = all.map((p) => {
    if (p.month === month && p.year === year) {
      return { ...p, isPaid: false };
    }
    return p;
  });
  await AsyncStorage.setItem(PAYMENTS_KEY, JSON.stringify(updated));
};

export const deleteAllPaymentsForMonth = async (month, year) => {
  const all = await getAllPayments();
  const filtered = all.filter((p) => !(p.month === month && p.year === year));
  await AsyncStorage.setItem(PAYMENTS_KEY, JSON.stringify(filtered));
};
