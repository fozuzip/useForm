import reduce from "lodash/reduce";

export const createInitialState = (config, initialValues = {}) => {
  return reduce(
    config,
    (state, fieldConfig, fieldName) => {
      let value;
      if (isValueField(config, fieldName)) {
        value = createField(fieldConfig, initialValues[fieldName]);
      } else {
        if (initialValues[fieldName]) {
          value = initialValues[fieldName].map(item =>
            createInitialState(fieldConfig, item)
          );
        } else {
          value = [createInitialState(fieldConfig, initialValues[fieldName])];
        }
      }
      return {
        ...state,
        [fieldName]: value
      };
    },
    {}
  );
};

const isValueField = (config, fieldName) =>
  typeof config[fieldName].initialValue !== "undefined";

const createField = (fieldConfig, initialValue) => {
  const isDefined = typeof initialValue !== "undefined";
  let value = isDefined ? initialValue : fieldConfig.initialValue;

  if (fieldConfig.transformOnLoad) {
    value = fieldConfig.transformOnLoad(value);
  }
  return {
    value,
    error: null
  };
};

export const collectValues = (formState, config, setFieldError) => {
  return reduce(
    formState,
    (values, fieldContent, fieldName) => {
      let value;
      if (isValueField(config, fieldName)) {
        value = collectFieldValue(fieldContent, config[fieldName]);
      } else {
        value = fieldContent.map(subState =>
          collectValues(subState, config[fieldName])
        );
      }
      return {
        ...values,
        [fieldName]: value
      };
    },
    {}
  );
};

const collectFieldValue = (fieldContent, fieldConfig) =>
  fieldConfig.transformOnSubmit
    ? fieldConfig.transformOnSubmit(fieldContent.value)
    : fieldContent.value;

export const stateHasErrors = state => {
  return reduce(
    state,
    (hasErrors, fieldContent) => {
      let valueHasErrors = false;
      if (typeof fieldContent.value === "undefined") {
        const arrayErrors = fieldContent.map(subState =>
          stateHasErrors(subState)
        );
        valueHasErrors = arrayErrors.reduce(
          (hasError, value) => (value === true ? true : hasError),
          false
        );
      } else {
        valueHasErrors = !!fieldContent.error;
      }

      return valueHasErrors ? true : hasErrors;
    },
    false
  );
};

export const setValidationErrors = (errors, setState) => {
  Object.entries(errors).forEach(([path, message]) => {
    setState(prevState =>
      createStateWithError(prevState, path.split("."), message)
    );
  });
};

const createStateWithError = (state, path, message) => {
  const [field, index, ...restPath] = path;

  return reduce(
    state,
    (state, content, fieldName) => {
      if (fieldName !== field) return { ...state, [fieldName]: content };

      let newContent;
      if (index) {
        content[index] = createStateWithError(
          content[index],
          restPath,
          message
        );
        newContent = [...content];
      } else {
        newContent = { ...content, error: message };
      }
      return {
        ...state,
        [fieldName]: newContent
      };
    },
    {}
  );
};

export const hasMissingRequiredFields = (state, config) => {
  return reduce(
    state,
    (hasErrors, content, fieldName) => {
      if (isValueField(config, fieldName)) {
        if (config[fieldName].isRequired && !content.value) {
          return true;
        } else {
          return hasErrors;
        }
      } else {
        const subFormHasErrors = content.reduce(
          (subFormHasErrors, subState) => {
            const hasErrors = hasMissingRequiredFields(
              subState,
              config[fieldName]
            );
            return hasErrors ? true : subFormHasErrors;
          },
          false
        );
        return subFormHasErrors ? true : hasErrors;
      }
    },
    false
  );
};

export const validateRequiredFields = (setState, config) =>
  setState(prevState => setRequiredFieldErrors(prevState, config));
const setRequiredFieldErrors = (state, config) => {
  return reduce(
    state,
    (state, content, fieldName) => {
      let newContent = { ...content };
      if (isValueField(config, fieldName)) {
        if (config[fieldName].isRequired && !content.value) {
          newContent.error = "The field is required";
        }
      } else {
        newContent = content.map(subState =>
          setRequiredFieldErrors(subState, config[fieldName])
        );
      }
      return {
        ...state,
        [fieldName]: newContent
      };
    },
    {}
  );
};
