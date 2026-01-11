# Credit Limits Design - Hierarchical System

## Overview
The system uses a **hierarchical credit limits approach** with two levels of configuration:

### 1. **Semester Limits** (Administrative/University-wide)
**Location**: `semesters` table (configured in `CreateSemester.jsx`)

**Purpose**: 
- University-wide or college-wide administrative policies
- Hard caps that apply to ALL students in that semester
- Administrative controls for resource management

**Fields**:
- `min_credit_hours`: Minimum credits required for full-time status
- `max_credit_hours`: Standard maximum credits allowed
- `max_credit_hours_with_permission`: Maximum with special permission
- `min_gpa_for_max_credits`: GPA requirement for maximum credits

**Example**: "Fall 2024 semester allows 12-18 credits for all students, 21 with permission"

### 2. **Major Sheet Limits** (Program-specific)
**Location**: `major_sheets` table (configured in `ManageMajorSheet.jsx`)

**Purpose**:
- Program-specific academic requirements
- Guidelines for optimal academic progress in a specific major
- Academic planning and graduation requirements

**Fields**:
- `min_credits_per_semester`: Minimum credits recommended/required for the program
- `max_credits_per_semester`: Maximum credits recommended for the program

**Example**: "Engineering major requires 15-18 credits per semester for optimal progress"

## Validation Logic (Implemented in `CreateEnrollment.jsx`)

### Hierarchical Rule: Apply the Stricter Limit

```javascript
// For MINIMUM credits:
effectiveMin = MAX(semesterMin, majorSheetMin)
// Takes the higher (stricter) minimum

// For MAXIMUM credits:
effectiveMax = MIN(semesterMax, majorSheetMax)
// Takes the lower (stricter) maximum
```

### Example Scenarios

**Scenario 1: Both Limits Exist**
- Semester: 12-18 credits
- Major Sheet: 15-16 credits
- **Effective**: 15-16 credits (stricter of the two)

**Scenario 2: Only Semester Limits**
- Semester: 12-18 credits
- Major Sheet: Not set
- **Effective**: 12-18 credits (semester limits apply)

**Scenario 3: Only Major Sheet Limits**
- Semester: Not set
- Major Sheet: 15-16 credits
- **Effective**: 15-16 credits (major sheet limits apply)

**Scenario 4: Major Sheet is More Restrictive**
- Semester: 12-21 credits (with permission)
- Major Sheet: 15-18 credits
- **Effective**: 15-18 credits (major sheet is stricter)
- **Note**: Even "with permission" max is capped at major sheet max

## Benefits of This Approach

1. **Flexibility**: 
   - Universities can set semester-wide policies
   - Programs can set major-specific requirements
   - Both work together harmoniously

2. **Simplicity**:
   - Clear hierarchy: Semester (administrative) → Major Sheet (academic)
   - One effective limit is calculated and displayed
   - No confusion about which limit applies

3. **Dynamic Configuration**:
   - Limits can be set at different levels
   - System automatically applies the appropriate limits
   - Changes at either level automatically reflect in enrollment

4. **Best Practice**:
   - Follows common academic systems where:
     - University sets administrative caps
     - Programs set academic guidelines
     - System enforces the stricter requirement

## UI Display

The enrollment interface shows:
1. **Effective Limits** (what's actually being enforced)
2. **Source Limits** (where the limits come from)
3. **Clear messaging** about which limit is blocking/proceeding

## Recommendations

### For Administrators:
- **Set Semester Limits**: These are your university-wide policies
- Keep them reasonable (e.g., 12-18 standard, 21 with permission)
- These apply to ALL students regardless of major

### For Major Sheet Configurators:
- **Set Major Sheet Limits**: These are program-specific guidelines
- They should typically be within or equal to semester limits
- They can be more restrictive if the program requires it
- Leave blank if program follows standard semester limits

### Best Practices:
- Semester limits should always be set (university policy)
- Major sheet limits are optional (program-specific refinement)
- If both are set, the system automatically applies the stricter limit
- Clear documentation helps users understand the hierarchy

