import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import HomeworkManagement from '../../components/subject/HomeworkManagement'

export default function CreateHomework() {
  const { id } = useParams()
  const navigate = useNavigate()

  const handleClose = () => {
    navigate(`/instructor/subjects/${id}`)
  }

  const handleSave = () => {
    navigate(`/instructor/subjects/${id}?tab=homework`)
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
          <h1 className="text-2xl font-bold text-gray-900">Create Homework</h1>
          <p className="text-gray-600">Create a new homework assignment for this subject</p>
        </div>
      </div>

      <HomeworkManagement
        subjectId={parseInt(id)}
        onClose={handleClose}
        onSave={handleSave}
      />
    </div>
  )
}




