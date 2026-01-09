import { createContext, useContext, useState, useEffect } from 'react'
import i18n from '../i18n'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Get language from localStorage or default to 'en'
    return localStorage.getItem('language') || 'en'
  })
  const [isRTL, setIsRTL] = useState(language === 'ar')

  useEffect(() => {
    // Update i18n language
    i18n.changeLanguage(language)
    // Update RTL state
    setIsRTL(language === 'ar')
    // Update document direction
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = language
    // Save to localStorage
    localStorage.setItem('language', language)
  }, [language])

  const changeLanguage = (lang) => {
    setLanguage(lang)
  }

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, isRTL }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}


