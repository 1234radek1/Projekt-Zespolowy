import { useEffect, useRef, useState } from 'react';
import { Designer } from '@pdfme/ui';
import { createTemplate } from '../api/reportApi.js';
import { BLANK_PDF, PDFME_PLUGINS, REPORT_FIELD_NAMES } from '../pdf/pdfmeConfig.js';
import { normalizeSchemaPages } from '../templates/templateSchema.js';

const DEFAULT_TEMPLATE_NAME = 'Nowy Szablon';

export function DesignTab({ onTemplateSaved }) {
  const designerContainerRef = useRef(null);
  const designerRef = useRef(null);
  const [templateName, setTemplateName] = useState(DEFAULT_TEMPLATE_NAME);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!designerContainerRef.current || designerRef.current) {
      return undefined;
    }

    designerRef.current = new Designer({
      domContainer: designerContainerRef.current,
      template: { basePdf: BLANK_PDF, schemas: [{}] },
      plugins: PDFME_PLUGINS,
    });

    return () => {
      designerRef.current?.destroy();
      designerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!status) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setStatus(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [status]);

  const saveTemplate = async () => {
    if (!designerRef.current) {
      return;
    }

    try {
      await createTemplate({
        name: templateName.trim() || DEFAULT_TEMPLATE_NAME,
        schemaContent: JSON.stringify(designerRef.current.getTemplate()),
      });

      setStatus({ type: 'success', message: 'Szablon zapisany.' });
      onTemplateSaved();
    } catch {
      setStatus({ type: 'error', message: 'Nie udało się zapisać szablonu.' });
    }
  };

  const addPage = () => {
    if (!designerRef.current) {
      return;
    }

    const template = designerRef.current.getTemplate();
    const schemas = normalizeSchemaPages(template.schemas);
    const insertIndex = designerRef.current.getPageCursor() + 1;
    schemas.splice(insertIndex, 0, []);

    const nextTemplate = {
      ...template,
      schemas,
    };

    designerRef.current.updateTemplate(nextTemplate);
    setStatus({ type: 'success', message: 'Dodano nową stronę.' });
  };

  return (
    <section className="design-tab">
      <div className="toolbar">
        <input
          className="text-input template-name-input"
          value={templateName}
          onChange={(event) => setTemplateName(event.target.value)}
          placeholder="Nazwa szablonu"
        />

        <button className="button button-primary" type="button" onClick={saveTemplate}>
          Zapisz
        </button>

        <button className="button button-secondary" type="button" onClick={addPage}>
          Dodaj stronę
        </button>

        {status && <span className={`status status-${status.type}`}>{status.message}</span>}

        <span className="field-hint">
          Pola: {REPORT_FIELD_NAMES.map((field) => <code key={field}>{field}</code>)}
        </span>
      </div>

      <div className="designer-canvas" ref={designerContainerRef} />
    </section>
  );
}
