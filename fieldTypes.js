import * as Yup from "yup";
import moment from "moment";

const types = {
  number: {
    initialValue: null,
    transformOnLoad: value => {
      if (value === null) return "";
      return parseFloat(value).toLocaleString("en", {
        maximumFractionDigits: 2
      });
    },
    transformOnSubmit: value => {
      if (isNaN(value)) {
        if (!value || value.length === 0) return null;
        return Number(value.replace(/[^\d\.]/g, ""));
      } else {
        return value;
      }
    },
    validation: Yup.number()
      .typeError("This must be a numeric value")
      // Dont throw errors when value is ''
      .transform((cv, ov) => (ov === "" ? undefined : cv))
  },
  date: {
    initialValue: null,
    transformOnLoad: m => (m ? moment(m) : null),
    transformOnSubmit: m => (m ? m.format("YYYY-MM-DD") : null)
  },
  dateTime: {
    initialValue: null,
    transformOnLoad: m => (m ? moment(m) : null),
    transformOnSubmit: m => (m ? m.format("YYYY-MM-DD HH:mm:ss") : null)
  },
  string: {
    initialValue: null
  },
  option: {
    initialValue: null
  },
  boolean: {
    initialValue: true,
    validation: Yup.boolean()
  },
  hidden: {
    initialValue: null
  }
};

const createFieldType = (type, config) => {
  const { required, positive, ...overrides } = config;
  config = { ...types[type], ...overrides };

  if (required) {
    config = {
      ...config,
      isRequired: true
    };
    config = addToValidation(config, v => v.required());
  }
  if (positive && type === "number") {
    config = addToValidation(config, v => v.positive());
  }

  return config;
};

const addToValidation = (config, cb) => {
  const validation = config.validation || Yup.mixed();
  return { ...config, validation: cb(validation) };
};

export const numberField = (config = {}) => createFieldType("number", config);
export const dateField = (config = {}) => createFieldType("date", config);
export const dateTimeField = (config = {}) =>
  createFieldType("dateTime", config);
export const stringField = (config = {}) => createFieldType("string", config);
export const optionField = (config = {}) => createFieldType("option", config);
export const booleanField = (config = {}) => createFieldType("boolean", config);
export const hiddenField = (config = {}) => createFieldType("hidden", config);

export const arrayOf = (config = {}) => ({
  initialValue: [],
  transformOnLoad: config.transformOnLoad
    ? values => values.map(config.transformOnLoad)
    : null,
  transformOnSubmit: config.transformOnSubmit
    ? values => values.map(config.transformOnSubmit)
    : null,
  validation: Yup.array().of(config.validation || false)
});
