import { generate } from '@pdfme/generator';
import { PDFME_PLUGINS } from './pdfmeConfig.js';
import { createReportValues } from '../reports/reportValues.js';
import { buildTemplateInput } from '../templates/templateSchema.js';

export async function generateReportPdf({ template, client, extraNotes }) {
  const input = buildTemplateInput(template, createReportValues(client, extraNotes));
  const pdf = await generate({ template, inputs: [input], plugins: PDFME_PLUGINS });
  downloadPdf(pdf, `Raport_${client.name}.pdf`);
}

function downloadPdf(pdf, fileName) {
  const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}
