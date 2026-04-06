import * as XLSX from 'xlsx'

export const QB_EXCEL_HEADERS = [
  'question_text',
  'question_type',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_indices',
  'difficulty_level',
  'bloom_level',
  'unit_number',
  'estimated_marks',
  'tags',
]

const NEEDS_OPTIONS = new Set(['multiple_choice', 'true_false'])

/** Types that store ordered items in option_a … option_d (and beyond ignored). */
const ORDER_TYPE = 'order'

export function downloadQuestionBankTemplate() {
  const examples = [
    ['What is 2 + 2?', 'multiple_choice', '3', '4', '5', '6', '1', 3, 'understand', 1, 1, ''],
    ['Select all primes (multi-correct example).', 'multiple_choice', '2', '3', '4', '9', '0,1', 3, 'analyze', 1, 2, 'math'],
    ['The earth is round.', 'true_false', 'True', 'False', '', '', '0', 3, 'understand', 1, 1, ''],
    ['Capital A | Country X\nCapital B | Country Y', 'matching', '', '', '', '', '', 3, 'apply', 1, 2, ''],
    ['Order: startup sequence', 'order', 'Power on', 'POST', 'Boot OS', 'Login', '', 3, 'understand', 1, 2, ''],
    ['The chemical symbol for water is _____.', 'fill_blank', '', '', '', '', '', 3, 'remember', 1, 1, ''],
    ['Short: define velocity.', 'short_answer', '', '', '', '', '', 3, 'remember', 1, 1, ''],
    ["Explain Newton's first law.", 'essay', '', '', '', '', '', 3, 'understand', 1, 5, 'physics'],
    ['What is 15 × 3?', 'numeric', '', '', '', '', '', 3, 'apply', 1, 1, ''],
    ['Submit a diagram (PDF) for this lab.', 'file_upload', '', '', '', '', '', 3, 'create', 1, 5, 'lab'],
  ]
  const ws = XLSX.utils.aoa_to_sheet([QB_EXCEL_HEADERS, ...examples])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Questions')
  const instructions = [
    ['Question bank import — instructions'],
    [''],
    ['Delete the example rows on the Questions sheet if you do not want them imported.'],
    ['question_type: multiple_choice, true_false, matching, order, fill_blank, short_answer, essay, numeric, file_upload'],
    ['For multiple_choice and true_false: use option_a … option_d; correct_indices is 0-based (A=0).'],
    ['Multiple correct (MCQ): list indices separated by commas, e.g. 0,2'],
    ['true_false: use 0 or 1 for the correct option row.'],
    ['order: put items in correct order in option_a, option_b, … (up to four columns).'],
    ['Other types (matching, fill_blank, …): usually leave options blank; matching pairs go in question_text.'],
  ]
  const wsInst = XLSX.utils.aoa_to_sheet(instructions)
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instructions')
  XLSX.writeFile(wb, 'question-bank-template.xlsx')
}

function parseCorrectIndices(cell) {
  if (cell === undefined || cell === null || cell === '') return []
  if (typeof cell === 'number' && !Number.isNaN(cell)) return [Math.trunc(cell)]
  const s = String(cell).trim()
  if (!s) return []
  return s
    .split(/[,;]/)
    .map((x) => Number(String(x).trim()))
    .filter((n) => !Number.isNaN(n))
}

/** Normalize one row from sheet_to_json (header row must match QB_EXCEL_HEADERS). */
export function normalizeExcelQuestionRow(row) {
  const get = (k) => {
    const v = row[k]
    if (v !== undefined && v !== null && v !== '') return v
    const lower = Object.keys(row).find((key) => key.toLowerCase() === k.toLowerCase())
    return lower !== undefined ? row[lower] : ''
  }

  let qt = String(get('question_type') || 'multiple_choice')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/\//g, '_')
  const qtAliases = {
    mcq: 'multiple_choice',
    mc: 'multiple_choice',
    tf: 'true_false',
    t_f: 'true_false',
    true_false: 'true_false',
    fill: 'fill_blank',
    'fill-blank': 'fill_blank',
    fillblank: 'fill_blank',
    sa: 'short_answer',
    short: 'short_answer',
    num: 'numeric',
    number: 'numeric',
    fu: 'file_upload',
    file: 'file_upload',
    upload: 'file_upload',
    ord: 'order',
    ordering: 'order',
    seq: 'order',
    match: 'matching',
  }
  if (qtAliases[qt]) qt = qtAliases[qt]

  const options = [get('option_a'), get('option_b'), get('option_c'), get('option_d')]
    .map((x) => (x === undefined || x === null ? '' : String(x).trim()))
    .filter(Boolean)

  let correct_indices = parseCorrectIndices(get('correct_indices'))
  const tagsRaw = get('tags')
  const tags =
    typeof tagsRaw === 'string'
      ? tagsRaw
          .split(/[,;\n]/)
          .map((x) => x.trim())
          .filter(Boolean)
      : Array.isArray(tagsRaw)
        ? tagsRaw.map((x) => String(x).trim()).filter(Boolean)
        : []

  return {
    question_text: String(get('question_text') ?? '').trim(),
    question_type: qt,
    options,
    correct_indices,
    difficulty_level: Number(get('difficulty_level')) || 3,
    bloom_level: String(get('bloom_level') || 'understand').trim(),
    unit_number: Number(get('unit_number')) || 1,
    estimated_marks: Number(get('estimated_marks')) || 1,
    tags,
  }
}

/** Build DB payload fields from normalized row; fixes correct_indices when empty. */
export function finalizeRowForBank(row) {
  const qt = row.question_type
  const useOpts = NEEDS_OPTIONS.has(qt)
  let options = useOpts ? row.options : []
  let correct_answers = []

  if (qt === ORDER_TYPE && row.options?.length) {
    options = [...row.options]
    correct_answers = options.map((_, i) => i)
  } else if (useOpts) {
    if (qt === 'true_false' && options.length < 2) {
      options = ['True', 'False']
    }
    correct_answers = [...new Set(row.correct_indices)].filter((i) => i >= 0 && i < options.length).sort((a, b) => a - b)
    if (correct_answers.length === 0 && options.length > 0) correct_answers = [0]
    if (qt === 'true_false' && correct_answers.length > 1) correct_answers = [correct_answers[0]]
  }

  return {
    question_text: row.question_text,
    question_type: qt,
    options,
    correct_answers,
    difficulty_level: row.difficulty_level,
    bloom_level: row.bloom_level,
    unit_number: row.unit_number,
    estimated_marks: row.estimated_marks,
    tags: row.tags,
  }
}

export function parseQuestionBankExcelFile(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  return json.map((r) => finalizeRowForBank(normalizeExcelQuestionRow(r))).filter((r) => r.question_text.length > 0)
}
