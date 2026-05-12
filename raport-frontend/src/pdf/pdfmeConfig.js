import { barcodes, image, text } from '@pdfme/schemas';

export const BLANK_PDF = 'data:application/pdf;base64,JVBERi0xLjQKJeb39/RyCjEgMCBvYmogPDwgL1R5cGUgL0NhdGFsb2cgL1BhZ2VzIDIgMCBSID4+IGVuZG9iagoyIDAgb2JqIDw8IC9UeXBlIC9QYWdlcyAvS2lkcyBbIDMgMCBSIF0gL0NvdW50IDEgPj4gZW5kb2JqCjMgMCBvYmogPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvUmVzb3VyY2VzIDw8ID4+IC9NZWRpYUJveCBbIDAgMCA1OTUuMjggODQxLjg5IF0gL0NvbnRlbnRzIDQgMCBSID4+IGVuZG9iago0IDAgb2JqIDw8IC9MZW5ndGggMCA+PiBzdHJlYW0KZW5kc3RyZWFtIGVuZG9iagp0cmFpbGVyIDw8IC9Sb290IDEgMCBSIC9TaXplIDUgPj4KJSVFT0Y=';

export const PDFME_PLUGINS = {
  text,
  image,
  qrcode: barcodes.qrcode,
};

export const REPORT_FIELD_NAMES = [
  'nazwa_klienta',
  'miasto',
  'email_klienta',
  'uwagi',
  'data',
  'numer_raportu',
];
