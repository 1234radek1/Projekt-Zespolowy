import { createFieldValue, normalizeSchemaPages } from './templateSchema.js';
import { normalizeBlankPdf } from '../pdf/pdfmeConfig.js';

const DEFAULT_FONT_SIZE = 13;
const DEFAULT_LINE_HEIGHT = 1;
const MM_TO_PX = 96 / 25.4;
const PT_TO_PX = 96 / 72;
const WIDTH_SAFETY_FACTOR = 0.96;

export function prepareTemplateForGeneration(template, values) {
  const pages = normalizeSchemaPages(template.schemas);
  const input = {};
  const schemas = [];

  pages.forEach((page, pageIndex) => {
    const nextPage = [];
    const continuationPages = [];

    page.forEach((field, fieldIndex) => {
      nextPage.push(field);

      if (!field.name) {
        return;
      }

      const value = createFieldValue(field, values);
      const chunks = splitFieldValue(field, value);
      input[field.name] = chunks[0] ?? '';

      chunks.slice(1).forEach((chunk, chunkIndex) => {
        const continuationName = `${field.name}__overflow_${pageIndex + 1}_${fieldIndex + 1}_${chunkIndex + 1}`;
        continuationPages.push([createContinuationField(field, continuationName)]);
        input[continuationName] = chunk;
      });
    });

    schemas.push(nextPage, ...continuationPages);
  });

  return {
    template: {
      ...template,
      basePdf: normalizeBlankPdf(template.basePdf),
      schemas,
    },
    input,
  };
}

function splitFieldValue(field, value) {
  if (!canPaginateField(field, value)) {
    return [value];
  }

  const lines = wrapText(value, getTextMetrics(field));
  const linesPerPage = getLinesPerPage(field);

  if (lines.length <= linesPerPage) {
    return [value];
  }

  const chunks = [];
  for (let index = 0; index < lines.length; index += linesPerPage) {
    chunks.push(lines.slice(index, index + linesPerPage).join('\n'));
  }

  return chunks;
}

function canPaginateField(field, value) {
  return field.type === 'text' && typeof value === 'string' && value.length > 0;
}

function createContinuationField(field, name) {
  return {
    ...field,
    name,
    content: '',
    required: false,
  };
}

function getTextMetrics(field) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const fontSizePx = getFontSize(field) * PT_TO_PX;
  const fontFamily = field.fontName || 'Arial';

  if (!context) {
    return {
      maxWidth: field.width * MM_TO_PX * WIDTH_SAFETY_FACTOR,
      measure: (text) => text.length * fontSizePx * 0.55,
    };
  }

  context.font = `${fontSizePx}px ${fontFamily}`;

  return {
    maxWidth: field.width * MM_TO_PX * WIDTH_SAFETY_FACTOR,
    measure: (text) => context.measureText(text).width,
  };
}

function getLinesPerPage(field) {
  const fontSizePx = getFontSize(field) * PT_TO_PX;
  const lineHeight = field.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const lineHeightPx = Math.max(1, fontSizePx * lineHeight);

  return Math.max(1, Math.floor((field.height * MM_TO_PX) / lineHeightPx));
}

function getFontSize(field) {
  return field.dynamicFontSize?.min ?? field.fontSize ?? DEFAULT_FONT_SIZE;
}

function wrapText(value, metrics) {
  return value
    .split('\n')
    .flatMap((paragraph) => wrapParagraph(paragraph, metrics));
}

function wrapParagraph(paragraph, metrics) {
  if (!paragraph) {
    return [''];
  }

  return paragraph.split(/\s+/).reduce((lines, word) => addWord(lines, word, metrics), ['']);
}

function addWord(lines, word, metrics) {
  const currentLine = lines[lines.length - 1];
  const candidate = currentLine ? `${currentLine} ${word}` : word;

  if (metrics.measure(candidate) <= metrics.maxWidth) {
    return replaceLast(lines, candidate);
  }

  if (currentLine) {
    lines.push('');
  }

  return addLongWord(lines, word, metrics);
}

function addLongWord(lines, word, metrics) {
  let currentLine = lines[lines.length - 1];

  Array.from(word).forEach((character) => {
    const candidate = `${currentLine}${character}`;

    if (!currentLine || metrics.measure(candidate) <= metrics.maxWidth) {
      currentLine = candidate;
      lines[lines.length - 1] = currentLine;
      return;
    }

    currentLine = character;
    lines.push(currentLine);
  });

  return lines;
}

function replaceLast(items, value) {
  return [...items.slice(0, -1), value];
}
