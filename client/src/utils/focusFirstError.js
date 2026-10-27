export function focusFirstError(form, errors) {
  const name = Object.keys(errors)[0];

  requestAnimationFrame(() => {
    if (name && form.isConnected) {
      form.elements.namedItem(name)?.focus();
    }
  });
}
