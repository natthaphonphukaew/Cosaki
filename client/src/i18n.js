import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import thTranslation from './locales/th.json';

// Get saved language from localStorage, default to Thai
const savedLanguage = localStorage.getItem('cosaki-lang') || 'th';

const resources = {
  en: {
    translation: enTranslation
  },
  th: {
    translation: thTranslation
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'th',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

// Save to localStorage when language changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('cosaki-lang', lng);
});

export default i18n;
