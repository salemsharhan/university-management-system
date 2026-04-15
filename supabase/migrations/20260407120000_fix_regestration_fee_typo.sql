-- Fix misspelled fee_type "regestration_fees" (invalid vs enum + fee_types catalog)
UPDATE finance_configuration
SET fee_type = 'registration_fee',
    updated_at = now()
WHERE fee_type = 'regestration_fees';

UPDATE fee_types
SET code = 'registration_fee',
    updated_at = now()
WHERE code = 'regestration_fees'
  AND NOT EXISTS (
    SELECT 1 FROM fee_types t2 WHERE t2.code = 'registration_fee' AND t2.id <> fee_types.id
  );
