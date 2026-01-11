import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Save, X, Upload, AlertCircle, Link as LinkIcon } from 'lucide-react'

export default function MaterialsManagement({ subjectId, materialId, onClose, onSave }) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [contentTypes, setContentTypes] = useState([])
  const [formData, setFormData] = useState({
    content_type_code: '',
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    file_url: '',
    external_link: '',
    display_order: 0,
    is_published: false,
    access_level: 'all',
  })

  useEffect(() => {
    fetchContentTypes()
    if (materialId) {
      fetchMaterial()
    }
  }, [materialId])

  const fetchContentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('subject_content_types')
        .select('*')
        .eq('is_active', true)
        .order('name_en')

      if (error) throw error
      setContentTypes(data || [])
    } catch (err) {
      console.error('Error fetching content types:', err)
    }
  }

  const fetchMaterial = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('subject_materials')
        .select('*')
        .eq('id', materialId)
        .single()

      if (fetchError) throw fetchError

      setFormData({
        content_type_code: data.content_type_code || '',
        title: data.title || '',
        title_ar: data.title_ar || '',
        description: data.description || '',
        description_ar: data.description_ar || '',
        file_url: data.file_url || '',
        external_link: data.external_link || '',
        display_order: data.display_order || 0,
        is_published: data.is_published || false,
        access_level: data.access_level || 'all',
      })
    } catch (err) {
      console.error('Error fetching material:', err)
      setError('Failed to load material')
    }
  }

  const handleFileUpload = async (file) => {
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${subjectId}_${Date.now()}.${fileExt}`
      const filePath = `materials/${subjectId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('subject-materials')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('subject-materials')
        .getPublicUrl(filePath)

      setFormData({ ...formData, file_url: publicUrl })
    } catch (err) {
      console.error('Error uploading file:', err)
      setError('Failed to upload file. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const selectedType = contentTypes.find(ct => ct.code === formData.content_type_code)
      if (!selectedType) {
        setError('Please select a content type')
        setLoading(false)
        return
      }

      const submitData = {
        subject_id: subjectId,
        content_type_code: formData.content_type_code,
        title: formData.title.trim(),
        title_ar: formData.title_ar.trim() || null,
        description: formData.description.trim() || null,
        description_ar: formData.description_ar.trim() || null,
        file_url: formData.content_type_code === 'CT_LNK' ? null : (formData.file_url || null),
        external_link: formData.content_type_code === 'CT_LNK' ? formData.external_link.trim() : null,
        display_order: parseInt(formData.display_order) || 0,
        is_published: formData.is_published,
        access_level: formData.access_level,
      }

      if (materialId) {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single()

        const { error: updateError } = await supabase
          .from('subject_materials')
          .update({
            ...submitData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', materialId)

        if (updateError) throw updateError
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single()

        const { error: insertError } = await supabase
          .from('subject_materials')
          .insert({
            ...submitData,
            created_by: userData.id,
          })

        if (insertError) throw insertError
      }

      if (onSave) onSave()
      if (onClose) onClose()
    } catch (err) {
      console.error('Error saving material:', err)
      setError(err.message || 'Failed to save material')
    } finally {
      setLoading(false)
    }
  }

  const selectedType = contentTypes.find(ct => ct.code === formData.content_type_code)
  const isLinkType = formData.content_type_code === 'CT_LNK'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {materialId ? 'Edit Material' : 'Add Material'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Type *
            </label>
            <select
              value={formData.content_type_code}
              onChange={(e) => setFormData({ ...formData, content_type_code: e.target.value, file_url: '', external_link: '' })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select content type...</option>
              {contentTypes.map(type => (
                <option key={type.code} value={type.code}>
                  {type.name_en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Material title"
            />
          </div>

          {isLinkType ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                External Link *
              </label>
              <input
                type="url"
                value={formData.external_link}
                onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload File {formData.file_url ? '(File uploaded)' : '*'}
              </label>
              <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.files[0]) {
                            handleFileUpload(e.target.files[0])
                          }
                        }}
                        accept={selectedType?.mime_types?.join(',')}
                        disabled={uploading}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {selectedType?.max_file_size ? `Max file size: ${(selectedType.max_file_size / 1024 / 1024).toFixed(0)}MB` : 'PDF, DOC, DOCX, PPT, PPTX up to 10MB'}
                  </p>
                  {uploading && (
                    <p className="text-sm text-blue-600">Uploading...</p>
                  )}
                </div>
              </div>
              {formData.file_url && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  File uploaded successfully
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Brief description of the material"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Order
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Level
              </label>
              <select
                value={formData.access_level}
                onChange={(e) => setFormData({ ...formData, access_level: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Students</option>
                <option value="students">Students Only</option>
                <option value="instructors">Instructors Only</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-sm font-medium text-gray-700">
              Publish immediately (students can see this material)
            </label>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading || (!formData.file_url && !isLinkType && !materialId)}
              className="flex items-center space-x-2 px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Saving...' : 'Save Material'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}




