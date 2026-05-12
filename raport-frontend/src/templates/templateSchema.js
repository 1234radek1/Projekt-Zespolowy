export function parseTemplate(template) {
  return JSON.parse(template.schemaContent);
}

export function getTemplateFieldNames(template) {
  return getTemplateFields(template.schemas)
    .map((field) => field.name)
    .filter(Boolean);
}

export function buildTemplateInput(template, values) {
  return getTemplateFields(template.schemas).reduce((input, field) => {
    if (!field.name) {
      return input;
    }

    return {
      ...input,
      [field.name]: createFieldValue(field, values),
    };
  }, {});
}

export function normalizeSchemaPages(schemas = []) {
  return schemas.map((page) => (
    Array.isArray(page) ? page : Object.values(page)
  ));
}

export function getTemplateFields(schemas = []) {
  return normalizeSchemaPages(schemas).flatMap((page) => page);
}

export function createFieldValue(field, values) {
  const baseContent = field.content ?? '';
  const value = values[field.name];

  return value === undefined ? baseContent : `${baseContent}${value}`;
}
