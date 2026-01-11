import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import HomeworkManagement from '../../components/subject/HomeworkManagement'

export default function EditHomework() {
  const { id, homeworkId } = useParams()
  const navigate = useNavigate()

  const handleClose = () => {
    navigate(`/instructor/subjects/${id}?tab=homework`)
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
          <h1 className="text-2xl font-bold text-gray-900">Edit Homework</h1>
          <p className="text-gray-600">Update homework assignment details</p>
        </div>
      </div>

      <HomeworkManagement
        subjectId={parseInt(id)}
        homeworkId={parseInt(homeworkId)}
        onClose={handleClose}
        onSave={handleSave}
      />
    </div>
  )
}




