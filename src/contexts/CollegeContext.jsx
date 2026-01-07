import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const CollegeContext = createContext()

export function CollegeProvider({ children }) {
  const { userRole } = useAuth()
  const [selectedCollegeId, setSelectedCollegeId] = useState(null)
  const [colleges, setColleges] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (userRole === 'admin') {
      fetchColleges()
      // Load from localStorage if available
      const savedCollegeId = localStorage.getItem('selectedCollegeId')
      if (savedCollegeId) {
        setSelectedCollegeId(parseInt(savedCollegeId))
      }
    } else {
      // Clear selection for non-admin users
      setSelectedCollegeId(null)
      localStorage.removeItem('selectedCollegeId')
    }
  }, [userRole])

  useEffect(() => {
    // Save to localStorage when selection changes
    if (userRole === 'admin' && selectedCollegeId) {
      localStorage.setItem('selectedCollegeId', selectedCollegeId.toString())
    }
  }, [selectedCollegeId, userRole])

  const fetchColleges = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('id, name_en, code, abbreviation')
        .eq('status', 'active')
        .order('name_en')

      if (error) throw error
      setColleges(data || [])
    } catch (err) {
      console.error('Error fetching colleges:', err)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    selectedCollegeId,
    setSelectedCollegeId,
    colleges,
    loading,
    isAdmin: userRole === 'admin',
    requiresCollegeSelection: userRole === 'admin' && !selectedCollegeId,
  }

  return (
    <CollegeContext.Provider value={value}>
      {children}
    </CollegeContext.Provider>
  )
}

export function useCollege() {
  const context = useContext(CollegeContext)
  if (!context) {
    throw new Error('useCollege must be used within a CollegeProvider')
  }
  return context
}



