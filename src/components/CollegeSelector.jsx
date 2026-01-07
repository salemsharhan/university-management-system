import { useCollege } from '../contexts/CollegeContext'
import { Building2, AlertCircle } from 'lucide-react'

export default function CollegeSelector() {
  const { selectedCollegeId, setSelectedCollegeId, colleges, loading, requiresCollegeSelection } = useCollege()

  if (!requiresCollegeSelection && selectedCollegeId) {
    const selectedCollege = colleges.find(c => c.id === selectedCollegeId)
    return (
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="w-5 h-5 text-primary-600" />
            <div>
              <p className="text-xs text-gray-500">Selected College</p>
              <p className="text-sm font-semibold text-gray-900">
                {selectedCollege?.name_en || 'Unknown'}
              </p>
            </div>
          </div>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {colleges.map(college => (
              <option key={college.id} value={college.id}>
                {college.name_en} ({college.code})
              </option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  if (requiresCollegeSelection) {
    return (
      <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-900">College Selection Required</p>
            <p className="text-xs text-yellow-700">Please select a college to continue</p>
          </div>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(parseInt(e.target.value))}
            className="px-4 py-2 border border-yellow-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            required
          >
            <option value="">Select College...</option>
            {loading ? (
              <option disabled>Loading colleges...</option>
            ) : (
              colleges.map(college => (
                <option key={college.id} value={college.id}>
                  {college.name_en} ({college.code})
                </option>
              ))
            )}
          </select>
        </div>
      </div>
    )
  }

  return null
}



