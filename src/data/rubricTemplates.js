/** Default matrices for “Use template” in admin rubric builder (aligned with seed migration). */
export const ACADEMIC_WRITING_TEMPLATE = {
  criteria: [
    {
      title: 'Content and ideas',
      weight_marks: 10,
      l4: 'Ideas are clear and highly developed, with strong supporting examples and deep analysis.',
      l3: 'Ideas are mostly clear with adequate examples and some analysis.',
      l2: 'Basic ideas with limited examples and surface-level analysis.',
      l1: 'Ideas unclear or missing, without examples or analysis.',
    },
    {
      title: 'Organization and structure',
      weight_marks: 8,
      l4: 'Excellent logical structure with clear introduction and conclusion and smooth transitions.',
      l3: 'Clear structure with some good transitions.',
      l2: 'Basic structure with limited transitions.',
      l1: 'Unclear or missing structure.',
    },
    {
      title: 'Language and style',
      weight_marks: 7,
      l4: 'Professional academic language with varied vocabulary and very few grammar errors.',
      l3: 'Good language with minor errors that do not affect meaning.',
      l2: 'Repeated errors that sometimes affect clarity.',
      l1: 'Many errors that hinder understanding.',
    },
    {
      title: 'Documentation and references',
      weight_marks: 5,
      l4: 'Full correct APA citation with a comprehensive reference list.',
      l3: 'Good documentation with minor formatting errors.',
      l2: 'Incomplete or inconsistent documentation.',
      l1: 'Missing or incorrect documentation.',
    },
  ],
}

export const ORAL_PRESENTATION_TEMPLATE = {
  criteria: [
    {
      title: 'Delivery & clarity',
      weight_marks: 10,
      l4: 'Confident, clear speech; strong eye contact; excellent pacing.',
      l3: 'Mostly clear delivery with minor hesitations.',
      l2: 'Uneven clarity; frequent reading from notes.',
      l1: 'Difficult to follow; poor pacing or articulation.',
    },
    {
      title: 'Content & structure',
      weight_marks: 10,
      l4: 'Well-organized; strong introduction/conclusion; meets time limits.',
      l3: 'Good structure with minor gaps.',
      l2: 'Basic organization; weak transitions.',
      l1: 'Disorganized or off-topic; timing issues.',
    },
  ],
}
