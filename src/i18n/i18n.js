import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import tr from './tr.json';
import en from './en.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = '@app_language';

export const loadLanguage = async () => {
  try {
    const lang = await AsyncStorage.getItem(LANGUAGE_KEY);
    return lang || 'tr';
  } catch {
    return 'tr';
  }
};

export const saveLanguage = async (lang) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
};

export const initI18n = async () => {
  const lang = await loadLanguage();
  await i18n.use(initReactI18next).init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    lng: lang,
    fallbackLng: 'tr',
    interpolation: { escapeValue: false },
  });
  return i18n;
};

export default i18n;
