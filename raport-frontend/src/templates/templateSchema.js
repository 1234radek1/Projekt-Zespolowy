export function parseTemplate(template) {
  return JSON.parse(template.schemaContent);
}

export function getTemplateFieldNames(template) {
  return getTemplateFields(template)
    .map((field) => field.name)
    .filter(Boolean);
}

export function buildTemplateInput(template, values) {
  return getTemplateFields(template).reduce((input, field) => {
    if (!field.name) {
      return input;
    }

    return {
      ...input,
      [field.name]: createFieldValue(field, values),
    };
  }, {});
}

function getTemplateFields(template) {
  return (template.schemas ?? []).flatMap((page) => (
    Array.isArray(page) ? page : Object.values(page)
  ));
}

function createFieldValue(field, values) {
  const baseContent = field.content ?? '';
  const value = values[field.name];

  return value === undefined ? baseContent : `${baseContent}${value}`;
}
