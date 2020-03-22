# useForm

A set of React hooks for managing and validating the state of forms with support for multiple and nested subforms
  
# Examples

### 1. Most Basic Form

State :
```
import { useForm, useFormState } from './useForm';

const { formState } = useForm({
    name: { initialValue: 0 }
  });
const { fields, changeField } = useFormState(formState);
```

Display: 
```
<Input label="name" {...fields.name} onChange={changeField('name')} />
```
### 2. Form configuration
The first argument of useForm is config.
The config object specifies the form's schema and provides info about the form's fields like initialValue and validation.

#### State :
```
import { useForm, useFormState } from 'utils/hooks';
import { number } from 'yup';

const { formState } = useForm({
  name: { initialValue: '' },
  gender: { initialValue: 'male' },
  age: {
    initialValue: 0,
    validation: number()
      .positive()
      .max(120)
  }
});
const { fields, changeField, selectField } = useFormState(formState);
```

#### Display :
```
<Input label="name" {...fields.gender} onChange={changeField('gender')} />
<Select
  label="gender"
  options={[
    { id: 'male', label: 'Male' },
    { id: 'female', label: 'Female' },
    { id: 'other', label: 'Unspecified' }
  ]}
  {...fields.name}
  onChange={selectField('name')}
/>
<Input label="age" {...fields.age} onChange={changeField('age')} />
```
### 3. Initializing Values
 using useForm's second argument
```
const values = { name: 'Pi', gender: 'male', age: 27 };
const { formState } = useForm(config, values);
```
 Using the loadValues function that is provided by useForm.
Calling loadValues resets the forms state.

```
const { formState, loadValues } = useForm(config);

...

<Button
  onClick={() => {
    loadValues({
      name: 'Other',
      gender: 'other',
      age: 75
    });
  }}
/>
```
### 4. Field Types
To create the configuration object more efficiently

fieldTypes provides some presets for different types of fields (numberField, dateField, optionField, stringField, booleanField, hiddenField, )

Example using numberField: 
```
const config = { numbersOnlyField: numberField() };

const { formState, loadValues, collectValues, hasErrors, isDirty } = useForm(config);
const { fields, changeField } = useFormState(formState);
```
```
config : {
  numbersOnlyField : {
    initialValue: null,
    transformOnLoad: value => {
      if (value === null) return '';
      return parseFloat(value).toLocaleString('en', { maximumFractionDigits: 2 });
    },
    
    transformOnSubmit: value => {
      if (isNaN(value)) {
        if (!value || value.length === 0) return null;
        return Number(value.replace(/[^d.]/g, ''));
      } else {
        return value;
      }
    },
    validation: Yup.number().typeError('This must be a numeric value')
  }
}
```

### 4.1 Providing your own configuration
You can easily override any of the properties that a fieldType creates by providing you own.
```
const config = {
  largeNumber: numberField({
    validation: number()
      .typeError('Not a number')
      .min(10000)
  })
};

const { formState } = useForm(config);
const { fields, changeField } = useFormState(formState);
```

### 5. Changing a field's value
useFormState returns 3 methods that can be used to change a fields value

* changeField Used with components that call onChange with an event value
```
const { formState, isDirty } = useForm({ name: { initialValue: '' } });
const { fields, changeField } = useFormState(formState);

// changeField = fieldName => event => ...
<Input {...fields.name} onChange={changeField('name')} />
```

* selectField Used with components that call onChange with a value
```
const { formState, isDirty } = useForm({ fruit: { initialValue: null } });
const { fields, selectField } = useFormState(formState);

// selectField = fieldName => value => ...
<Select
  {...fields.name}
  options={[
    { id: 'banana', label: 'Banana' },
    { id: 'apple', label: 'Apple' },
    { id: 'orange', label: 'Orange' }
  ]}
  onChange={selectField('fruit')}
/>
```
* setFieldValue Used for fields that are not being edited directly by the user ( doesn't affect the isDirty value when called)
```
const { formState, isDirty } = useForm({ counter: { initialValue: 0 } });
const { fields, setFieldValue } = useFormState(formState);

// setFieldValue = (fieldName, value) => ...
<Button
  color="light"
  onClick={() => setFieldValue('counter', fields.counter.value + 5)}
  className="mr-2"
>
  + 5
</Button>
```
### 6. Submitting Values
Use the collectValues function that is provided by useForm.
the isDirty and hasErrors properties can be used to controll if a user can submit the form or not.
```
const { formState, collectValues, isDirty, hasErrors } = useForm(config);

const handleSubmit = () => {
  const params = collectValues();
  ....
}

<Button dissabled={hasErrors || !isDirty} onClick={handleSubmit} />
```
### 6.1. Handling Api Errors
To display validation errors thrown by the api use set setFieldError
```
const { formState, collectValues, handleSubmitError } = useForm(config);
const { fields, changeField, selectField } = useFormState(formState);

const handleSubmit = async () => {
  const params = collectValues();

  try {
    await sendToApi(params);
  } catch (error) {
    handleSubmitError(error);
  }
};
```
### 7. Dynamic Forms
if the config object has a field which contains other fields the inner fields are dynamic.
```
const config = {
  tax: numberField({
    validation: number()
      .min(0)
      .max(100)
  }),
  products: {
    name: stringField(),
    price: numberField()
  }
};
```
useFormState provides some helper methods for dynamic fields.
* addSubform : (fieldName, initialState = ) => ... , Adds a subform to the end of the field's array.
* removeSubform : (fieldName, i) => ... , Removes the subform with index 'i'.
* subStates : (fieldName) => ... , Returns a list of formState objects. use the formStates on useFormState hooks to control a specific substate.

#### Example :
```
const Form = () => {  
  const { formState } = useForm(config);
  const { fields, changeField, subStates, addSubform } = useFormState(formState);

  return (
    <>
      <Input label="Tax" {...fields.tax} onChange={changeField} />
      <p>Products :</p>
      {subStates('products').map(productState => (
        <ProductForm formState={productState} />
      ))}
      <Button onClick={() => addSubform('products')}>
        Add Product
      </Button>
    </>
  );
};

const ProductForm = ({ formState }) => {
  const { fields, changeField, removeSelf } = useFormState(formState);

  return (
    <FormContainer>
      <Input
        label="Name"
        {...fields.name}
        onChange={changeField('name')}
      />
      <Input
        label="Price"
        {...fields.price}
        onChange={changeField('price')}
      />
      <Button color="danger" onClick={removeSelf}>
        -
      </Button>
    </FormContainer>
  );
};
```

### 8. FormList
#### Basic Example :
```
<FormList forms={subStates('products')}>
  {productState => <ProductForm formState={productState} />}
</FormList>
```
ProductForm :
```
const ProductForm = ({ formState }) => {
  const { fields, changeField } = useFormState(formState);

  return (
    <div className="d-flex">
      <Input
        label="Name"
        {...fields.name}
        onChange={changeField('name')}
        className="flex-fill mr-1"
      />
      <Input
        label="Price"
        {...fields.price}
        onChange={changeField('price')}
        className="flex-fill mr-2"
      />
    </div>
  );
};
```
#### With Add/Remove :
```
<FormList
  forms={subStates('products')}
  onRemove={index => removeSubform('products', index)}
  onAdd={() => addSubform('products')}
>
  {productState => <ProductForm formState={productState} />}
</FormList>
```
#### With conditional Add:
```
<FormList
  forms={subStates('products')}
  onRemove={index => removeSubform('products', index)}
  onAdd={() => addSubform('products')}
  canAdd={fields.products.length < 5}
  addText={'Add Products'}
>
  {productState => <ProductForm formState={productState} />}
</FormList>
```
#### With filtering:
```
// Costs <= 10
<FormList forms={subStates('products')} filter={fields => fields.price.value <= 10}>
  {productState => <ProductForm formState={productState} />}
</FormList>

// Costs > 10
<FormList forms={subStates('products')} filter={fields => fields.price.value > 10}>
  {productState => <ProductForm formState={productState} />}
</FormList>
```
### 9. Nested Dynamic Forms
You can nest subforms as many levels deep as you need.
example:
```
const config = {
  field1: stringField(),
  array1: {
    field2: stringField(),
    array2: {
      field3: stringField(),
      array3: {
        field4: stringField()
      }
    }
  }
};

const Form1 = () => {
  const { formState } = useForm(config);
  const { fields, changeField, subStates, addSubform, removeSubform } = useFormState(formState);

  return (
    <>
      <Input label="Field 1" {...fields.field1} onChange={changeField('field1')} />
      <FormList
        forms={subStates('array1')}
        onAdd={() => addSubform('array1')}
        onRemove={index => removeSubform('array1', index)}
        addText={'Add Form 2'}
      >
        {subState => <Form2 formState={subState} />}
      </FormList>
    </>
  );
};

const Form2 = ({ formState }) => {
  const { fields, changeField, subStates, addSubform, removeSubform } = useFormState(formState);

  return (
    <>
      <Input label="Field 2" {...fields.field2} onChange={changeField('field2')} />
      <FormList
        forms={subStates('array2')}
        onAdd={() => addSubform('array2')}
        onRemove={index => removeSubform('array2', index)}
        addText={'Add Form 3'}
      >
        {subState => <Form3 formState={subState} />}
      </FormList>
    </>
  );
};

const Form3 = ({ formState }) => {
  const { fields, changeField, subStates, addSubform, removeSubform } = useFormState(formState);

  return (
    <>
      <Input label="Field 3" {...fields.field3} onChange={changeField('field3')} />
      <FormList
        forms={subStates('array3')}
        onAdd={() => addSubform('array3')}
        onRemove={index => removeSubform('array3', index)}
        addText={'Add Form 4'}
      >
        {subState => <Form4 formState={subState} />}
      </FormList>
    </>
  );
};

const Form4 = ({ formState }) => {
  const { fields, changeField } = useFormState(formState);

  return (
    <>
      <Input label="Field 4" {...fields.field4} onChange={changeField('field4')} />
    </>
  );
};
```
