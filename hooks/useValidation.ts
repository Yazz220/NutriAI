import { useState, useCallback } from 'react';
import { ValidationResult, validateInventoryItem, validateMealPlan } from '@/utils/validation';

export const useValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = useCallback((fieldName: string, value: any, validator: (value: any) => ValidationResult) => {
    const result = validator(value);
    
    setErrors(prev => ({
      ...prev,
      [fieldName]: result.isValid ? '' : result.errors[0] || 'Invalid input'
    }));

    return result.isValid;
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: ''
    }));
  }, []);

  const hasErrors = Object.values(errors).some(error => error !== '');

  return {
    errors,
    validateField,
    clearErrors,
    clearFieldError,
    hasErrors,
    validateInventoryItem: (item: any) => validateInventoryItem(item),
    validateMealPlan: (meal: any) => validateMealPlan(meal),
  };
};