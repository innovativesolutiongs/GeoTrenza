export const validate = async (fields: any[], formData: any) => {
  const errors: Record<string, string> = {};

  fields.forEach(field => {
    const key = field.name; // must match exactly your formData keys
    const value = formData[key];

    if (field.validate.includes("required") && (!value || value.toString().trim() === "")) {
      errors[key] = `${field.label} is required`;
    }
  });

  // If there are errors, return the errors object, else return true
  return Object.keys(errors).length ? errors : true;
};
