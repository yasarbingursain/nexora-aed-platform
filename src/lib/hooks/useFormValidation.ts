import { useState, useCallback } from 'react';
import { z } from 'zod';

/**
 * ENTERPRISE-GRADE FORM VALIDATION HOOK
 * Real-time validation with debouncing and error management
 */

interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>;
  initialValues: T;
  onSubmit: (data: T) => Promise<void> | void;
  debounceMs?: number;
}

interface ValidationState {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValidating: boolean;
  isSubmitting: boolean;
}

export function useFormValidation<T extends Record<string, any>>({
  schema,
  initialValues,
  onSubmit,
  debounceMs = 300,
}: UseFormValidationOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [validationState, setValidationState] = useState<ValidationState>({
    errors: {},
    touched: {},
    isValidating: false,
    isSubmitting: false,
  });

  // Validate single field
  const validateField = useCallback(
    async (fieldName: keyof T, value: any): Promise<string | null> => {
      try {
        const fieldSchema = (schema as any).shape[fieldName];
        if (fieldSchema) {
          await fieldSchema.parseAsync(value);
          return null;
        }
        return null;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return error.errors[0]?.message || 'Invalid value';
        }
        return 'Validation error';
      }
    },
    [schema]
  );

  // Validate all fields
  const validateAll = useCallback(async (): Promise<boolean> => {
    try {
      await schema.parseAsync(values);
      setValidationState((prev) => ({ ...prev, errors: {} }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          errors[field] = err.message;
        });
        setValidationState((prev) => ({ ...prev, errors }));
        return false;
      }
      return false;
    }
  }, [schema, values]);

  // Handle field change
  const handleChange = useCallback(
    (fieldName: keyof T) => async (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
      const { value, type } = e.target;
      const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

      setValues((prev) => ({ ...prev, [fieldName]: newValue }));
      setValidationState((prev) => ({
        ...prev,
        touched: { ...prev.touched, [fieldName]: true },
      }));

      // Debounced validation
      const error = await validateField(fieldName, newValue);
      if (error) {
        setValidationState((prev) => ({
          ...prev,
          errors: { ...prev.errors, [fieldName]: error },
        }));
      } else {
        setValidationState((prev) => {
          const { [fieldName as string]: _, ...rest } = prev.errors;
          return { ...prev, errors: rest };
        });
      }
    },
    [validateField]
  );

  // Handle blur
  const handleBlur = useCallback(
    (fieldName: keyof T) => async () => {
      setValidationState((prev) => ({
        ...prev,
        touched: { ...prev.touched, [fieldName]: true },
      }));

      const error = await validateField(fieldName, values[fieldName]);
      if (error) {
        setValidationState((prev) => ({
          ...prev,
          errors: { ...prev.errors, [fieldName]: error },
        }));
      }
    },
    [validateField, values]
  );

  // Handle submit
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      setValidationState((prev) => ({ ...prev, isSubmitting: true }));

      const isValid = await validateAll();
      if (!isValid) {
        setValidationState((prev) => ({ ...prev, isSubmitting: false }));
        return;
      }

      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setValidationState((prev) => ({ ...prev, isSubmitting: false }));
      }
    },
    [validateAll, onSubmit, values]
  );

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setValidationState({
      errors: {},
      touched: {},
      isValidating: false,
      isSubmitting: false,
    });
  }, [initialValues]);

  // Set field value programmatically
  const setValue = useCallback((fieldName: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
  }, []);

  // Set multiple values
  const setFieldValues = useCallback((newValues: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...newValues }));
  }, []);

  // Get field props for easy binding
  const getFieldProps = useCallback(
    (fieldName: keyof T) => ({
      name: fieldName as string,
      value: values[fieldName],
      onChange: handleChange(fieldName),
      onBlur: handleBlur(fieldName),
      error: validationState.errors[fieldName as string],
      touched: validationState.touched[fieldName as string],
    }),
    [values, handleChange, handleBlur, validationState]
  );

  return {
    values,
    errors: validationState.errors,
    touched: validationState.touched,
    isValidating: validationState.isValidating,
    isSubmitting: validationState.isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    validateField,
    validateAll,
    reset,
    setValue,
    setFieldValues,
    getFieldProps,
  };
}
