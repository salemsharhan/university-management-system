/** Majors visible on public registration / admission forms (major_status lifecycle). */
export const MAJOR_STATUS_FOR_APPLICATION_DROPDOWN = ['open_for_admission', 'active']

/** Legacy `status` column: inactive only when the program is fully shut down. */
export function legacyMajorRecordStatus(majorStatus) {
  return ['archived', 'suspended'].includes(majorStatus) ? 'inactive' : 'active'
}
