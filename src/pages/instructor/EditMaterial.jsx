import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import MaterialsManagement from '../../components/subject/MaterialsManagement'

export default function EditMaterial() {
  const { id, materialId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const classId = searchParams.get('classId') ? parseInt(searchParams.get('classId')) : null
  const isClassMaterial = !!classId

  const handleClose = () => {
    navigate(`/instructor/subjects/${id}?tab=materials`)
  }

  const handleSave = () => {
    navigate(`/instructor/subjects/${id}?tab=materials`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Material</h1>
          <p className="text-gray-600">
            {isClassMaterial ? 'Edit class material' : 'Edit subject material'}
          </p>
        </div>
      </div>

      <MaterialsManagement
        subjectId={parseInt(id)}
        classId={classId}
        materialId={parseInt(materialId)}
        isClassMaterial={isClassMaterial}
        onClose={handleClose}
        onSave={handleSave}
      />
    </div>
  )
}
