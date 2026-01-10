import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { Plus, X, AlertCircle, Info, Save, RefreshCw } from 'lucide-react'

export default function StudentLifecycleSettings() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('status-codes')

  const [statusCodes, setStatusCodes] = useState([])
  const [transitionReasons, setTransitionReasons] = useState([])
  const [workflowTransitions, setWorkflowTransitions] = useState([])
  const [financialMilestones, setFinancialMilestones] = useState([])
  const [financialHolds, setFinancialHolds] = useState([])
  const [studentActions, setStudentActions] = useState([])
  const [subjectActions, setSubjectActions] = useState([])
  const [milestoneActions, setMilestoneActions] = useState([])
  const [holdBlockedActions, setHoldBlockedActions] = useState([])
  const [milestoneStatusImpact, setMilestoneStatusImpact] = useState([])

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      // Fetch status codes
      const { data: statusData } = await supabase
        .from('student_status_codes')
        .select('*')
        .eq('is_active', true)
        .order('category, code')
      
      if (statusData) setStatusCodes(statusData)

      // Fetch transition reasons
      const { data: reasonsData } = await supabase
        .from('status_transition_reasons')
        .select('*')
        .eq('is_active', true)
        .order('reason_type, code')
      
      if (reasonsData) setTransitionReasons(reasonsData)

      // Fetch workflow transitions
      const { data: transitionsData } = await supabase
        .from('status_workflow_transitions')
        .select('*')
        .eq('is_active', true)
        .order('from_status_code, to_status_code')
      
      if (transitionsData) setWorkflowTransitions(transitionsData)

      // Fetch financial milestones
      const { data: milestonesData } = await supabase
        .from('financial_milestones')
        .select('*')
        .eq('is_active', true)
        .order('percentage_threshold')
      
      if (milestonesData) setFinancialMilestones(milestonesData)

      // Fetch financial holds
      const { data: holdsData } = await supabase
        .from('financial_hold_reasons')
        .select('*')
        .eq('is_active', true)
      
      if (holdsData) setFinancialHolds(holdsData)

      // Fetch student actions
      const { data: actionsData } = await supabase
        .from('student_actions')
        .select('*')
        .eq('is_active', true)
        .order('action_category, code')
      
      if (actionsData) setStudentActions(actionsData)

      // Fetch subject actions
      const { data: subjectActionsData } = await supabase
        .from('subject_actions')
        .select('*')
        .eq('is_active', true)
        .order('action_type, code')
      
      if (subjectActionsData) setSubjectActions(subjectActionsData)

      // Fetch milestone actions (simplified - codes only)
      const { data: milestoneActionsData } = await supabase
        .from('financial_milestone_actions')
        .select('*')
      
      if (milestoneActionsData) setMilestoneActions(milestoneActionsData)

      // Fetch hold blocked actions (simplified - codes only)
      const { data: holdBlockedData } = await supabase
        .from('financial_hold_blocked_actions')
        .select('*')
      
      if (holdBlockedData) setHoldBlockedActions(holdBlockedData)

      // Fetch milestone status impact (simplified - codes only)
      const { data: statusImpactData } = await supabase
        .from('financial_milestone_status_impact')
        .select('*')
      
      if (statusImpactData) setMilestoneStatusImpact(statusImpactData)
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMilestoneAction = async () => {
    const milestoneSelect = document.getElementById('milestone-select')
    const actionSelect = document.getElementById('action-select')
    
    if (!milestoneSelect?.value || !actionSelect?.value) {
      alert('Please select both milestone and action')
      return
    }

    try {
      const { error } = await supabase
        .from('financial_milestone_actions')
        .insert({
          milestone_code: milestoneSelect.value,
          action_code: actionSelect.value,
          is_enabled: true
        })

      if (error) throw error
      
      milestoneSelect.value = ''
      actionSelect.value = ''
      fetchAllData()
    } catch (err) {
      console.error('Error adding milestone action:', err)
      alert('Failed to add rule: ' + (err.message || 'Unknown error'))
    }
  }

  const handleRemoveMilestoneAction = async (id) => {
    if (!confirm('Are you sure you want to remove this rule?')) return

    try {
      const { error } = await supabase
        .from('financial_milestone_actions')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchAllData()
    } catch (err) {
      console.error('Error removing rule:', err)
      alert('Failed to remove rule')
    }
  }

  const handleToggleMilestoneAction = async (id, currentEnabled) => {
    try {
      const { error } = await supabase
        .from('financial_milestone_actions')
        .update({ is_enabled: !currentEnabled })
        .eq('id', id)

      if (error) throw error
      fetchAllData()
    } catch (err) {
      console.error('Error toggling rule:', err)
    }
  }

  const handleAddHoldBlockedAction = async () => {
    const holdSelect = document.getElementById('hold-select')
    const actionSelect = document.getElementById('hold-action-select')
    
    if (!holdSelect?.value || !actionSelect?.value) {
      alert('Please select both hold reason and action')
      return
    }

    try {
      const { error } = await supabase
        .from('financial_hold_blocked_actions')
        .insert({
          hold_reason_code: holdSelect.value,
          action_code: actionSelect.value,
          is_blocked: true
        })

      if (error) throw error
      
      holdSelect.value = ''
      actionSelect.value = ''
      fetchAllData()
    } catch (err) {
      console.error('Error adding hold blocked action:', err)
      alert('Failed to add rule: ' + (err.message || 'Unknown error'))
    }
  }

  const handleRemoveHoldBlockedAction = async (id) => {
    if (!confirm('Are you sure you want to remove this rule?')) return

    try {
      const { error } = await supabase
        .from('financial_hold_blocked_actions')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchAllData()
    } catch (err) {
      console.error('Error removing rule:', err)
      alert('Failed to remove rule')
    }
  }

  const handleAddMilestoneStatusImpact = async () => {
    const milestoneSelect = document.getElementById('milestone-status-select')
    const statusSelect = document.getElementById('status-select')
    const automaticCheckbox = document.getElementById('automatic-status-impact')
    
    if (!milestoneSelect?.value || !statusSelect?.value) {
      alert('Please select both milestone and target status')
      return
    }

    try {
      const { error } = await supabase
        .from('financial_milestone_status_impact')
        .insert({
          milestone_code: milestoneSelect.value,
          target_status_code: statusSelect.value,
          is_automatic: automaticCheckbox?.checked || false,
          is_active: true
        })

      if (error) throw error
      
      milestoneSelect.value = ''
      statusSelect.value = ''
      if (automaticCheckbox) automaticCheckbox.checked = false
      fetchAllData()
    } catch (err) {
      console.error('Error adding milestone status impact:', err)
      alert('Failed to add rule: ' + (err.message || 'Unknown error'))
    }
  }

  const handleRemoveMilestoneStatusImpact = async (id) => {
    if (!confirm('Are you sure you want to remove this rule?')) return

    try {
      const { error } = await supabase
        .from('financial_milestone_status_impact')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchAllData()
    } catch (err) {
      console.error('Error removing rule:', err)
      alert('Failed to remove rule')
    }
  }

  const sections = [
    { id: 'status-codes', name: t('universitySettings.studentLifecycle.statusCodes'), icon: Info },
    { id: 'workflow', name: t('universitySettings.studentLifecycle.workflowTransitions'), icon: RefreshCw },
    { id: 'financial-rules', name: t('universitySettings.studentLifecycle.financialRules'), icon: AlertCircle },
  ]

  if (loading && statusCodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="border-b border-gray-200">
        <nav className={`flex ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-4 py-3 border-b-2 transition-colors ${
                  activeSection === section.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{section.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Status Codes Section */}
      {activeSection === 'status-codes' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Status codes are predefined and managed in the database. 
              These codes control the student lifecycle from application to graduation.
            </p>
          </div>

          {/* Status Codes by Category */}
          {['application', 'review', 'decision', 'enrollment', 'academic', 'graduation'].map(category => {
            const categoryCodes = statusCodes.filter(sc => sc.category === category)
            if (categoryCodes.length === 0) return null

            return (
              <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-900 capitalize">{category} Status Codes</h4>
                </div>
                <div className="divide-y divide-gray-200">
                  {categoryCodes.map(code => (
                    <div key={code.id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{code.code}</div>
                          <div className="text-sm text-gray-600">{code.name_en}</div>
                          <div className={`text-sm ${isRTL ? 'text-right' : 'text-left'} text-gray-500 mt-1`} dir="rtl">
                            {code.name_ar}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          code.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {code.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Transition Reasons */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transition Reasons</h3>
            {['request_info', 'reject', 'hold'].map(reasonType => {
              const reasons = transitionReasons.filter(r => r.reason_type === reasonType)
              if (reasons.length === 0) return null

              return (
                <div key={reasonType} className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900 capitalize">{reasonType.replace('_', ' ')} Reasons</h4>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {reasons.map(reason => (
                      <div key={reason.id} className="px-4 py-3 hover:bg-gray-50">
                        <div className="font-medium text-gray-900">{reason.code}</div>
                        <div className="text-sm text-gray-600">{reason.name_en}</div>
                        <div className={`text-sm ${isRTL ? 'text-right' : 'text-left'} text-gray-500 mt-1`} dir="rtl">
                          {reason.name_ar}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Workflow Transitions Section */}
      {activeSection === 'workflow' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Workflow Transitions:</strong> These define valid status transitions and their triggers. 
              Automatic transitions are system-driven, while manual ones require user action.
            </p>
          </div>

          {workflowTransitions.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From → To</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trigger</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requires Reason</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workflowTransitions.map(transition => (
                    <tr key={transition.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {transition.from_status_code} → {transition.to_status_code}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{transition.trigger_code}</div>
                        <div className="text-xs text-gray-500">{transition.trigger_name_en}</div>
                      </td>
                      <td className="px-4 py-3">
                        {transition.is_automatic ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Automatic</span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Manual</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {transition.requires_reason ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Yes</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No workflow transitions configured</p>
          )}
        </div>
      )}

      {/* Financial Rules Section */}
      {activeSection === 'financial-rules' && (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Golden Rule:</strong> Finance NEVER changes status manually. Finance triggers permissions, 
              holds, and automation, and the system adjusts access & lifecycle automatically.
            </p>
          </div>

          {/* Financial Milestones */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Milestones</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {financialMilestones.map(milestone => (
                <div key={milestone.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="font-medium text-gray-900">{milestone.code}</div>
                  <div className="text-sm text-gray-600 mt-1">{milestone.name_en}</div>
                  <div className="text-xs text-gray-500 mt-1">{milestone.percentage_threshold}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Hold Reasons */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Hold Reasons</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {financialHolds.map(hold => (
                <div key={hold.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="font-medium text-red-900">{hold.code}</div>
                  <div className="text-sm text-red-700 mt-1">{hold.name_en}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Milestone Actions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('finance.rules.milestoneActions')}</h3>
            
            {/* Add New Rule */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  id="milestone-select"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">{t('finance.rules.milestone')}...</option>
                  {financialMilestones.map(m => (
                    <option key={m.id} value={m.code}>{m.code} - {m.name_en}</option>
                  ))}
                </select>
                <select
                  id="action-select"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">{t('finance.rules.action')}...</option>
                  {studentActions.map(a => (
                    <option key={a.id} value={a.code}>{a.code} - {a.name_en} ({a.action_category})</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddMilestoneAction}
                  className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700`}
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('finance.rules.addRule')}</span>
                </button>
              </div>
            </div>

            {/* Existing Rules */}
            {milestoneActions.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.rules.milestone')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.rules.action')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.rules.enabled')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {milestoneActions.map(rule => (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {rule.financial_milestones?.code || rule.milestone_code}
                          </div>
                          <div className="text-xs text-gray-500">
                            {rule.financial_milestones?.name_en || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {rule.student_actions?.code || rule.action_code}
                          </div>
                          <div className="text-xs text-gray-500">
                            {rule.student_actions?.name_en || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={rule.is_enabled}
                            onChange={() => handleToggleMilestoneAction(rule.id, rule.is_enabled)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRemoveMilestoneAction(rule.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">{t('finance.rules.noRules')}</p>
            )}
          </div>

          {/* Financial Hold Blocked Actions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('finance.rules.holdBlockedActions')}</h3>
            
            {/* Add New Hold Block Rule */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  id="hold-select"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Hold Reason...</option>
                  {financialHolds.map(h => (
                    <option key={h.id} value={h.code}>{h.code} - {h.name_en}</option>
                  ))}
                </select>
                <select
                  id="hold-action-select"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Action to Block...</option>
                  {studentActions.map(a => (
                    <option key={a.id} value={a.code}>{a.code} - {a.name_en}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddHoldBlockedAction}
                  className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Block Rule</span>
                </button>
              </div>
            </div>

            {/* Existing Hold Block Rules */}
            {holdBlockedActions.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hold Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.rules.blocked')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {holdBlockedActions.map(rule => (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-red-900">
                            {rule.hold_reason_code}
                          </div>
                          <div className="text-xs text-red-700">
                            {financialHolds.find(h => h.code === rule.hold_reason_code)?.name_en || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {rule.action_code}
                          </div>
                          <div className="text-xs text-gray-500">
                            {studentActions.find(a => a.code === rule.action_code)?.name_en || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRemoveHoldBlockedAction(rule.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">{t('finance.rules.noRules')}</p>
            )}
          </div>

          {/* Financial Milestone Status Impact */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('finance.rules.milestoneStatusImpact')}</h3>
            
            {/* Add New Status Impact Rule */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  id="milestone-status-select"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Milestone...</option>
                  {financialMilestones.map(m => (
                    <option key={m.id} value={m.code}>{m.code} - {m.name_en}</option>
                  ))}
                </select>
                <select
                  id="status-select"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Target Status...</option>
                  {statusCodes.map(sc => (
                    <option key={sc.id} value={sc.code}>{sc.code} - {sc.name_en}</option>
                  ))}
                </select>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="automatic-status-impact"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="automatic-status-impact" className="text-sm text-gray-700">
                    {t('finance.rules.automatic')}
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleAddMilestoneStatusImpact}
                  className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Impact Rule</span>
                </button>
              </div>
            </div>

            {/* Existing Status Impact Rules */}
            {milestoneStatusImpact.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.rules.milestone')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.rules.targetStatus')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.rules.automatic')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {milestoneStatusImpact.map(impact => (
                      <tr key={impact.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {impact.milestone_code}
                          </div>
                          <div className="text-xs text-gray-500">
                            {financialMilestones.find(m => m.code === impact.milestone_code)?.name_en || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {impact.target_status_code}
                          </div>
                          <div className="text-xs text-gray-500">
                            {statusCodes.find(sc => sc.code === impact.target_status_code)?.name_en || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {impact.is_automatic ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Yes</span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRemoveMilestoneStatusImpact(impact.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">{t('finance.rules.noRules')}</p>
            )}
          </div>

          {/* Student Actions Reference */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Actions Reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(
                studentActions.reduce((acc, action) => {
                  if (!acc[action.action_category]) acc[action.action_category] = []
                  acc[action.action_category].push(action)
                  return acc
                }, {})
              ).map(([category, actions]) => (
                <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 capitalize">{category}</h4>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {actions.map(action => (
                      <div key={action.id} className="px-3 py-2 hover:bg-gray-50">
                        <div className="text-xs font-mono text-gray-600">{action.code}</div>
                        <div className="text-sm text-gray-900">{action.name_en}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

