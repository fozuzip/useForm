import { useState, useCallback, useMemo } from "react";
import {
  createInitialState,
  collectValues,
  stateHasErrors,
  setValidationErrors,
  hasMissingRequiredFields,
  validateRequiredFields
} from "./helpers";
import debounce from "lodash/debounce";

export const useForm = (config, initialValues) => {
  const initialState = useMemo(
    () => createInitialState(config, initialValues),
    []
  );
  const [state, setFormState] = useState(initialState);
  const [isDirty, setIsDirty] = useState(false);
  const setField = useCallback((fieldName, transformContent) => {
    setFormState(formState => ({
      ...formState,
      [fieldName]: transformContent(formState[fieldName])
    }));
  }, []);

  // re-initialize (like in Formik)
  const loadValues = useCallback(values => {
    setFormState(createInitialState(config, values));
    setIsDirty(false);
  }, []);

  const collect = useCallback(
    (validateBeforeSubmittion = true) => {
      if (
        validateBeforeSubmittion &&
        hasMissingRequiredFields(state, config) === true
      ) {
        validateRequiredFields(setFormState, config);
        return null;
      } else {
        setIsDirty(false);
        return collectValues(state, config);
      }
    },
    [state]
  );
  const hasErrors = useMemo(() => stateHasErrors(state), [state]);

  const handleSubmitError = useCallback(error => {
    if (error.status === 422) {
      setValidationErrors(error.data.errors, setFormState);
    }
    setIsDirty(true);
  }, []);

  const resetForm = useCallback(() => {
    setFormState(initialState);
  }, []);

  return {
    formState: { state, config, setField, isDirty, setIsDirty },
    collectValues: collect,
    loadValues,
    hasErrors,
    isDirty,
    handleSubmitError,
    resetForm
  };
};

export const useFormState = form => {
  const setFieldValue = useCallback((fieldName, value) => {
    form.setField(fieldName, field => ({ value: value, error: field.error }));
  }, []);

  const setFieldError = useCallback(
    (fieldName, error) =>
      form.setField(fieldName, field => ({ value: field.value, error: error })),
    []
  );

  const validateField = useCallback(
    fieldName =>
      debounce(value => {
        const { validation, transformOnSubmit } = form.config[fieldName];
        if (!validation) {
          setFieldError(fieldName, null);
          return;
        }

        validation
          .validate(transformOnSubmit ? transformOnSubmit(value) : value)
          .then(() => {
            setFieldError(fieldName, null);
          })
          .catch(err => {
            setFieldError(fieldName, err.message);
          });
      }, 300),
    []
  );

  const changeFieldValue = useCallback(
    (fieldName, value, affectsDirtyStatus = true) => {
      validateField(fieldName)(value);
      setFieldValue(fieldName, value);
      if (!form.isDirty && affectsDirtyStatus) form.setIsDirty(true);
    },
    []
  );

  const changeField = useCallback(
    fieldName => (e, changeStatus) =>
      changeFieldValue(fieldName, e.target.value, changeStatus),
    []
  );
  const selectField = useCallback(
    fieldName => (option, changeStatus) =>
      changeFieldValue(fieldName, option, changeStatus),
    []
  );

  const addSubform = useCallback(
    (arrayName, initialState = {}) => {
      form.setField(arrayName, array => [
        ...array,
        createInitialState(form.config[arrayName], initialState)
      ]);
      if (!form.isDirty) form.setIsDirty(true);
    },
    [form]
  );

  const removeSubform = useCallback(
    (arrayName, index) => {
      form.setField(arrayName, array => array.filter((_, i) => i !== index));
      if (!form.isDirty) form.setIsDirty(true);
    },
    [form]
  );

  const setArrayField = (arrayName, index) => {
    return (fieldName, transformContent) =>
      form.setField(arrayName, array =>
        array.map((fields, i) =>
          i === index
            ? {
                ...fields,
                [fieldName]: transformContent(fields[fieldName])
              }
            : fields
        )
      );
  };

  const subState = (arrayName, index) => ({
    index: index,
    state: form.state[arrayName][index],
    setField: setArrayField(arrayName, index),
    config: form.config[arrayName],
    isDirty: form.isDirty,
    setIsDirty: form.setIsDirty,
    remove: () => removeSubform(arrayName, index)
  });

  const subStates = arrayName =>
    form.state[arrayName].map((_, index) => subState(arrayName, index));

  return {
    fields: form.state,
    removeSelf: form.remove,
    changeField,
    selectField,
    addSubform,
    removeSubform,
    setFieldError,
    subState,
    subStates,
    setFieldValue
  };
};
