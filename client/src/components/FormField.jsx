export default function FormField({ name, label, hint, error, options, ...inputProps }) {
  const describedBy = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(' ');
  const props = {
    ...inputProps,
    id: name,
    name,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy || undefined,
  };

  return (
    <div className="form-field">
      <label htmlFor={name}>{label}</label>
      {options ? (
        <select {...props}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : <input {...props} />}
      {hint && <p id={`${name}-hint`} className="field-hint">{hint}</p>}
      {error && <p id={`${name}-error`} className="field-error">{error}</p>}
    </div>
  );
}
