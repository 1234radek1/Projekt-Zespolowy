import { useMemo, useState } from 'react';
import { generateReportPdf } from '../pdf/reportPdf.js';
import { getTemplateFieldNames, parseTemplate } from '../templates/templateSchema.js';
import { createReportPreviewValues } from '../reports/reportValues.js';

export function GenerateTab({ clients, templates, isLoading, error, onRetry }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [generationError, setGenerationError] = useState('');

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
  const selectedClient = clients.find((client) => String(client.id) === selectedClientId);

  const parsedTemplate = useMemo(() => {
    if (!selectedTemplate) {
      return null;
    }

    try {
      return parseTemplate(selectedTemplate);
    } catch {
      return null;
    }
  }, [selectedTemplate]);

  const templateFields = parsedTemplate ? getTemplateFieldNames(parsedTemplate) : [];
  const fieldValues = createReportPreviewValues(selectedClient, extraNotes);

  const handleGenerate = async () => {
    setGenerationError('');

    if (!selectedTemplate || !selectedClient) {
      setGenerationError('Wybierz szablon i klienta.');
      return;
    }

    if (!parsedTemplate) {
      setGenerationError('Wybrany szablon ma niepoprawny JSON.');
      return;
    }

    try {
      await generateReportPdf({
        template: parsedTemplate,
        client: selectedClient,
        extraNotes,
      });
    } catch (err) {
      setGenerationError(err.message || 'Nie udało się wygenerować PDF.');
    }
  };

  return (
    <section className="generate-tab">
      <div className="generator-panel">
        <div className="panel-header">
          <div>
            <h1>Generator raportu</h1>
            <p>Wybierz szablon, klienta i wygeneruj gotowy PDF.</p>
          </div>

          {error && (
            <button className="button button-secondary" type="button" onClick={onRetry}>
              Odśwież dane
            </button>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {isLoading && <div className="alert">Ładowanie danych...</div>}

        <FormField label="Szablon">
          <select
            className="select-input"
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
          >
            <option value="">Wybierz szablon</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Klient">
          <select
            className="select-input"
            value={selectedClientId}
            onChange={(event) => setSelectedClientId(event.target.value)}
          >
            <option value="">Wybierz klienta</option>
            {clients.map((client) => (
              <option key={client.id} value={String(client.id)}>
                {client.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Uwagi dodatkowe">
          <textarea
            className="textarea-input"
            value={extraNotes}
            onChange={(event) => setExtraNotes(event.target.value)}
            placeholder="Wpisz uwagi, które pojawią się w PDF..."
          />
        </FormField>

        {templateFields.length > 0 && (
          <TemplateFieldsPreview fields={templateFields} values={fieldValues} />
        )}

        {generationError && <div className="alert alert-error">{generationError}</div>}

        <button className="button button-primary button-full" type="button" onClick={handleGenerate}>
          Pobierz PDF
        </button>
      </div>
    </section>
  );
}

function FormField({ label, children }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TemplateFieldsPreview({ fields, values }) {
  return (
    <div className="fields-preview">
      <div className="fields-preview-title">Pola szablonu</div>

      <table>
        <tbody>
          {fields.map((field) => (
            <tr key={field}>
              <td>
                <code>{field}</code>
              </td>
              <td>{values[field] ?? <span className="muted">nieznane pole</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
