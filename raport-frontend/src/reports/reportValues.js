export function createReportValues(client, extraNotes) {
  const now = new Date();

  return {
    nazwa_klienta: client?.name ?? '',
    miasto: client?.city ?? '',
    email_klienta: client?.email ?? '',
    uwagi: extraNotes || '',
    data: now.toLocaleDateString('pl-PL'),
    numer_raportu: createReportNumber(now),
  };
}

export function createReportPreviewValues(client, extraNotes) {
  return {
    nazwa_klienta: client?.name || '-',
    miasto: client?.city || '-',
    email_klienta: client?.email || '-',
    uwagi: extraNotes || '(puste)',
    data: new Date().toLocaleDateString('pl-PL'),
    numer_raportu: 'RAP/...',
  };
}

function createReportNumber(date) {
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  return `RAP/${date.getFullYear()}/${suffix}`;
}
