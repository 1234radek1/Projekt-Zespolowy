import { useRef, useEffect, useState } from 'react';
import { Designer } from '@pdfme/ui';
import { generate } from '@pdfme/generator';
import { text, image, barcodes, table } from '@pdfme/schemas';

const BLANK_PDF = { width: 210, height: 297, padding: [10, 10, 10, 10] };
const API_URL = 'http://localhost:5000/api';
const PLUGINS = { text, image, qrcode: barcodes.qrcode, table };

const btn = (bg) => ({
    background: bg, color: 'white', border: 'none',
    padding: '8px 18px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold',
});

const measureTextHeightAndSplit = (text, widthMm, heightMm, fontSizePt = 13, lineHeight = 1.15) => {
    const mmToPx = 96 / 25.4;
    const ptToPx = 96 / 72;
    const widthPx = widthMm * mmToPx;
    const heightPx = heightMm * mmToPx;
    const fontSizePx = fontSizePt * ptToPx;
    const lineH = fontSizePx * lineHeight;
    const maxLines = Math.floor(heightPx / lineH);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSizePx}px Arial`;

    const words = text.split(/(\s+)/);
    let currentLine = "";
    let lines = [];
    let overflowText = "";

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (lines.length >= maxLines) {
            overflowText += words.slice(i).join("");
            break;
        }

        if (word.includes('\n')) {
            const subparts = word.split('\n');
            for (let j = 0; j < subparts.length; j++) {
                if (j > 0) {
                    lines.push(currentLine);
                    currentLine = "";
                    if (lines.length >= maxLines) {
                        overflowText += subparts.slice(j).join('\n') + words.slice(i + 1).join("");
                        break;
                    }
                }
                const testLine = currentLine + subparts[j];
                const metrics = ctx.measureText(testLine);
                if (metrics.width > widthPx && currentLine) {
                    lines.push(currentLine);
                    currentLine = subparts[j];
                    if (lines.length >= maxLines) {
                        overflowText += subparts.slice(j).join('\n') + words.slice(i + 1).join("");
                        break;
                    }
                } else {
                    currentLine = testLine;
                }
            }
            if (lines.length >= maxLines) {
                break;
            }
            continue;
        }

        const testLine = currentLine + word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > widthPx && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (lines.length < maxLines && currentLine) {
        lines.push(currentLine);
    } else if (currentLine) {
        overflowText = currentLine + overflowText;
    }

    return {
        fitText: lines.join(""),
        overflowText: overflowText
    };
};

const consolidateOverflows = (tmpl) => {
    let changed = false;
    const schemas = tmpl.schemas ?? [];
    
    // 1. Zidentyfikujmy wszystkie oryginalne pola tekstowe (bez "_overflow_")
    const originalFields = [];
    for (let pageIdx = 0; pageIdx < schemas.length; pageIdx++) {
        const page = schemas[pageIdx];
        const fields = Array.isArray(page) ? page : Object.values(page);
        for (const field of fields) {
            if (field.name && field.type === 'text' && !field.name.includes('_overflow_')) {
                originalFields.push({ name: field.name, field, pageIdx });
            }
        }
    }

    // 2. Dla każdego oryginalnego pola, znajdźmy jego powiązane pola overflow i skonsolidujmy tekst
    for (const orig of originalFields) {
        let fullText = orig.field.content ?? '';
        const prefix = `${orig.name}_overflow_`;
        
        // Szukamy w kolejnych stronach pól o nazwie pasującej do wzorca overflow
        const fieldsToRemove = [];
        for (let pageIdx = 0; pageIdx < schemas.length; pageIdx++) {
            const page = schemas[pageIdx];
            const fields = Array.isArray(page) ? page : Object.values(page);
            for (const f of fields) {
                if (f.name && f.name.startsWith(prefix)) {
                    fullText += f.content ?? '';
                    fieldsToRemove.push({ name: f.name, pageIdx });
                }
            }
        }

        if (fieldsToRemove.length > 0) {
            changed = true;
            orig.field.content = fullText;

            // Usuwamy powiązane pola overflow ze stron
            for (const toRemove of fieldsToRemove) {
                const page = schemas[toRemove.pageIdx];
                if (Array.isArray(page)) {
                    const idx = page.findIndex(f => f.name === toRemove.name);
                    if (idx !== -1) page.splice(idx, 1);
                } else if (page && typeof page === 'object') {
                    delete page[toRemove.name];
                }
            }
        }
    }

    // 3. Usuńmy puste strony powstałe po konsolidacji (pomijamy pierwszą stronę, by szablon zawsze miał min. 1 stronę)
    for (let pageIdx = schemas.length - 1; pageIdx > 0; pageIdx--) {
        const page = schemas[pageIdx];
        const fields = Array.isArray(page) ? page : Object.values(page);
        if (fields.length === 0) {
            schemas.splice(pageIdx, 1);
            changed = true;
        }
    }

    return changed;
};

function App() {
    const [activeTab, setActiveTab] = useState('design');
    const [templates, setTemplates] = useState([]);
    const [clients, setClients] = useState([]);
    const [reportName, setReportName] = useState('Nowy Szablon');
    const [editTemplateId, setEditTemplateId] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [extraNotes, setExtraNotes] = useState('');
    const [statusMsg, setStatusMsg] = useState('');
    const designerRef = useRef(null);
    const designerInstance = useRef(null);

    const flash = (msg) => { setStatusMsg(msg); setTimeout(() => setStatusMsg(''), 3000); };

    const fetchData = async () => {
        try {
            const [rT, rC] = await Promise.all([
                fetch(`${API_URL}/templates`),
                fetch(`${API_URL}/data/clients`),
            ]);
            if (rT.ok) setTemplates(await rT.json());
            if (rC.ok) setClients(await rC.json());
        } catch (e) {
            console.error('API error:', e);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const isUpdatingRef = useRef(false);

    useEffect(() => {
        if (!designerRef.current || designerInstance.current) return;
        designerInstance.current = new Designer({
            domContainer: designerRef.current,
            template: { basePdf: BLANK_PDF, schemas: [{}] },
            plugins: PLUGINS,
        });

        designerInstance.current.onChangeTemplate((tmpl) => {
            if (isUpdatingRef.current) return;

            let changed = false;
            const updatedTemplate = JSON.parse(JSON.stringify(tmpl));

            // Konwertuj basePdf na dynamiczny jeśli jest stringiem
            if (typeof updatedTemplate.basePdf === 'string') {
                updatedTemplate.basePdf = { width: 210, height: 297, padding: [10, 10, 10, 10] };
                changed = true;
            }

            // Konsoliduj dotychczasowe overflow
            if (consolidateOverflows(updatedTemplate)) {
                changed = true;
            }

            for (let pageIdx = 0; pageIdx < updatedTemplate.schemas.length; pageIdx++) {
                const page = updatedTemplate.schemas[pageIdx];
                const isArray = Array.isArray(page);
                const fields = isArray ? page : Object.values(page);

                for (const field of fields) {
                    if (!field.name || field.type !== 'text') continue;

                    const fullText = field.content ?? '';
                    if (!fullText) continue;

                    const fontSize = field.fontSize ?? 13;
                    const lineHeight = field.lineHeight ?? 1.15;
                    const { fitText, overflowText } = measureTextHeightAndSplit(
                        fullText,
                        field.width,
                        field.height,
                        fontSize,
                        lineHeight
                    );

                    if (overflowText) {
                        changed = true;
                        field.content = fitText;

                        const newFieldName = `${field.name}_overflow_${pageIdx + 1}_${Math.floor(Math.random() * 1000)}`;
                        const newField = {
                            ...field,
                            name: newFieldName,
                            content: overflowText,
                            position: {
                                x: field.position.x,
                                y: 15
                            },
                            height: (updatedTemplate.basePdf?.height ?? 297) - 15 - 15
                        };

                        let newPage;
                        if (isArray) {
                            newPage = [newField];
                        } else {
                            newPage = { [newFieldName]: newField };
                        }

                        updatedTemplate.schemas.splice(pageIdx + 1, 0, newPage);
                    }
                }
            }

            if (changed) {
                isUpdatingRef.current = true;
                designerInstance.current.updateTemplate(updatedTemplate);
                setTimeout(() => {
                    isUpdatingRef.current = false;
                }, 50);
            }
        });

        return () => {
            designerInstance.current?.destroy();
            designerInstance.current = null;
        };
    }, []);

    const handleDesignTemplateChange = (id) => {
        setEditTemplateId(id);
        if (!id) {
            setReportName('Nowy Szablon');
            designerInstance.current?.updateTemplate({ basePdf: BLANK_PDF, schemas: [{}] });
            return;
        }
        const t = templates.find(temp => temp.id === id);
        if (t) {
            setReportName(t.name);
            try {
                designerInstance.current?.updateTemplate(JSON.parse(t.schemaContent));
            } catch (e) {
                console.error('Error parsing schemaContent:', e);
            }
        }
    };

    const saveTemplate = async (saveAsNew = false) => {
        if (!designerInstance.current) return;
        const tmpl = designerInstance.current.getTemplate();
        const isEditing = editTemplateId && !saveAsNew;
        const url = isEditing ? `${API_URL}/templates/${editTemplateId}` : `${API_URL}/templates`;
        const method = isEditing ? 'PUT' : 'POST';

        const body = {
            name: reportName,
            schemaContent: JSON.stringify(tmpl)
        };
        if (isEditing) {
            body.id = editTemplateId;
        }

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                flash('✅ Zapisano!');
                const savedTemplate = await res.json();
                await fetchData();
                if (!isEditing && savedTemplate?.id) {
                    setEditTemplateId(savedTemplate.id);
                }
            } else {
                flash(`❌ Błąd zapisu: ${res.status}`);
            }
        } catch {
            flash('❌ Brak połączenia z backendem');
        }
    };

    const deleteTemplate = async () => {
        if (!editTemplateId) return;
        if (!window.confirm('Czy na pewno chcesz usunąć ten szablon?')) return;

        try {
            const res = await fetch(`${API_URL}/templates/${editTemplateId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                flash('✅ Usunięto szablon!');
                if (selectedTemplateId === editTemplateId) {
                    setSelectedTemplateId('');
                }
                setEditTemplateId('');
                setReportName('Nowy Szablon');
                designerInstance.current?.updateTemplate({ basePdf: BLANK_PDF, schemas: [{}] });
                await fetchData();
            } else {
                flash(`❌ Błąd usuwania: ${res.status}`);
            }
        } catch {
            flash('❌ Brak połączenia z backendem');
        }
    };

    const addPage = () => {
        if (!designerInstance.current) return;
        const tmpl = designerInstance.current.getTemplate();
        const updatedTemplate = {
            ...tmpl,
            schemas: [...tmpl.schemas, []]
        };
        designerInstance.current.updateTemplate(updatedTemplate);
        flash('✅ Dodano nową stronę');
    };

    const removePage = () => {
        if (!designerInstance.current) return;
        const tmpl = designerInstance.current.getTemplate();
        if (tmpl.schemas.length <= 1) {
            flash('⚠️ Szablon musi mieć co najmniej jedną stronę!');
            return;
        }
        if (!window.confirm('Czy na pewno chcesz usunąć ostatnią stronę?')) return;
        const updatedTemplate = {
            ...tmpl,
            schemas: tmpl.schemas.slice(0, -1)
        };
        designerInstance.current.updateTemplate(updatedTemplate);
        flash('✅ Usunięto ostatnią stronę');
    };

    const handleGeneratePdf = async () => {
        const templateData = templates.find(t => t.id === selectedTemplateId);
        const client = clients.find(c => String(c.id) === selectedClientId);
        if (!templateData || !client) { alert('Wybierz szablon i klienta!'); return; }

        let parsedTemplate;
        try {
            parsedTemplate = JSON.parse(templateData.schemaContent);
        } catch (e) {
            alert('Błąd: schemaContent nie jest poprawnym JSON-em.\n' + e.message);
            return;
        }

        const values = {
            nazwa_klienta: client.name ?? '',
            miasto: client.city ?? '',
            email_klienta: client.email ?? '',
            uwagi: extraNotes,
            data: new Date().toLocaleDateString('pl-PL'),
            numer_raportu: `RAP/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 9000) + 1000)}`,
        };

        // Łączymy etykietę (content ze schematu) z wartością z bazy w jednym polu.
        const modifiedTemplate = parsedTemplate;

        // Jeśli szablon ma stary format base64, konwertujemy go na dynamiczny format A4 z marginesem 10mm
        if (typeof modifiedTemplate.basePdf === 'string') {
            modifiedTemplate.basePdf = { width: 210, height: 297, padding: [10, 10, 10, 10] };
        }

        // Konsolidujemy wszelkie istniejące pola overflow w szablonie przed wstrzyknięciem nowych wartości i nowym podziałem
        consolidateOverflows(modifiedTemplate);

        const inputRecord = {};
        for (const page of (modifiedTemplate.schemas ?? [])) {
            const fields = Array.isArray(page)
                ? page
                : Object.values(page);
            for (const field of fields) {
                if (!field.name) continue;
                if (field.name in values) {
                    inputRecord[field.name] = (field.content ?? '') + values[field.name];
                } else {
                    inputRecord[field.name] = field.content ?? '';
                }
            }
        }

        // Pętla po stronach szablonu (używamy standardowej pętli, bo możemy wstawiać strony w locie)
        for (let pageIdx = 0; pageIdx < modifiedTemplate.schemas.length; pageIdx++) {
            const page = modifiedTemplate.schemas[pageIdx];
            const isArray = Array.isArray(page);
            const fields = isArray ? page : Object.values(page);

            for (const field of fields) {
                if (!field.name || field.type !== 'text') continue;

                const fullText = inputRecord[field.name] ?? '';
                if (!fullText) continue;

                const fontSize = field.fontSize ?? 13;
                const lineHeight = field.lineHeight ?? 1.15;
                const { fitText, overflowText } = measureTextHeightAndSplit(
                    fullText,
                    field.width,
                    field.height,
                    fontSize,
                    lineHeight
                );

                if (overflowText) {
                    // Aktualizujemy obecne pole do tekstu, który mieści się w danej ramce
                    inputRecord[field.name] = fitText;

                    // Unikalna nazwa nowego pola na nowej stronie (zapobiega zaciąganiu z bazy)
                    const newFieldName = `${field.name}_overflow_${pageIdx + 1}_${Math.floor(Math.random() * 1000)}`;

                    // Nowe pole tekstowe na nowej stronie (rozciągnięte w pionie)
                    const newField = {
                        ...field,
                        name: newFieldName,
                        content: '',
                        position: {
                            x: field.position.x,
                            y: 15
                        },
                        height: (modifiedTemplate.basePdf?.height ?? 297) - 15 - 15
                    };

                    let newPage;
                    if (isArray) {
                        newPage = [newField];
                    } else {
                        newPage = { [newFieldName]: newField };
                    }

                    // Wstawiamy nową stronę za obecną
                    modifiedTemplate.schemas.splice(pageIdx + 1, 0, newPage);
                    inputRecord[newFieldName] = overflowText;
                }
            }
        }

        // Numeracja stron – pole readOnly z wyrażeniem pdfme {currentPage} / {totalPages}
        const totalPages = modifiedTemplate.schemas.length;
        const pdfHeight = modifiedTemplate.basePdf?.height ?? 297;
        const pdfWidth = modifiedTemplate.basePdf?.width ?? 210;
        const padding = modifiedTemplate.basePdf?.padding ?? [10, 10, 10, 10];
        const rightPadding = padding[1] ?? 10;
        const bottomPadding = padding[2] ?? 10;
        const pageNumberWidth = 30;
        const pageNumberHeight = 8;

        modifiedTemplate.schemas.forEach((page, idx) => {
            const fieldName = `__page_number_${idx}__`;
            const pageNumField = {
                name: fieldName,
                type: 'text',
                content: '{currentPage}',
                readOnly: true,
                position: {
                    x: pdfWidth - rightPadding - pageNumberWidth,
                    y: pdfHeight - bottomPadding - pageNumberHeight,
                },
                width: pageNumberWidth,
                height: pageNumberHeight,
                fontSize: 9,
                fontColor: '#000000',
                alignment: 'right',
                lineHeight: 1,
            };
            if (Array.isArray(page)) {
                page.push(pageNumField);
            } else {
                page[fieldName] = pageNumField;
            }
        });

        console.log('[pdfme] modifiedTemplate:', modifiedTemplate);
        console.log('[pdfme] inputRecord:', inputRecord);

        try {
            const pdf = await generate({ template: modifiedTemplate, inputs: [inputRecord], plugins: PLUGINS });
            const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Raport_${client.name}.pdf`;
            link.click();
        } catch (err) {
            console.error('generate() error:', err);
            alert(`Błąd generowania PDF:\n${err.message}`);
        }
    };

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    const selectedClient = clients.find(c => String(c.id) === selectedClientId);
    const schemaFields = (() => {
        if (!selectedTemplate) return [];
        try {
            const parsed = JSON.parse(selectedTemplate.schemaContent);
            return (parsed.schemas ?? []).flatMap(page =>
                Array.isArray(page)
                    ? page.map(f => f.name).filter(Boolean)
                    : Object.keys(page)
            );
        } catch { return []; }
    })();

    const fieldValues = {
        nazwa_klienta: selectedClient?.name ?? '—',
        miasto: selectedClient?.city ?? '—',
        email_klienta: selectedClient?.email ?? '—',
        uwagi: extraNotes || '(puste)',
        data: new Date().toLocaleDateString('pl-PL'),
        numer_raportu: 'RAP/...',
    };

    const navBtn = (tab, label) => ({
        padding: '15px 25px',
        background: activeTab === tab ? '#3498db' : 'transparent',
        color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold',
    });

    return (
        <div style={{ fontFamily: 'sans-serif', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', background: '#2c3e50', flexShrink: 0 }}>
                <button onClick={() => setActiveTab('design')} style={navBtn('design')}>1. PROJEKTOWANIE</button>
                <button onClick={() => setActiveTab('generate')} style={navBtn('generate')}>2. GENEROWANIE</button>
            </div>

            {/* ── ZAKŁADKA PROJEKTOWANIE ── */}
            <div style={{ display: activeTab === 'design' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
                <div style={{ padding: '8px 12px', background: '#ecf0f1', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Szablon:</span>
                        <select
                            value={editTemplateId}
                            onChange={e => handleDesignTemplateChange(e.target.value)}
                            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                            <option value="">-- Nowy szablon --</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <input
                        value={reportName}
                        onChange={e => setReportName(e.target.value)}
                        style={{ padding: '6px', width: '220px', borderRadius: '4px', border: '1px solid #ccc' }}
                        placeholder="Nazwa szablonu"
                    />
                    <button onClick={() => saveTemplate(false)} style={btn('#27ae60')}>
                        {editTemplateId ? 'ZAPISZ ZMIANY' : 'ZAPISZ'}
                    </button>
                    {editTemplateId && (
                        <>
                            <button onClick={() => saveTemplate(true)} style={btn('#f39c12')}>
                                ZAPISZ JAKO NOWY (KOPIA)
                            </button>
                            <button onClick={deleteTemplate} style={btn('#e74c3c')}>
                                USUŃ
                            </button>
                        </>
                    )}
                    <div style={{ borderLeft: '1px solid #ccc', height: '24px', margin: '0 5px' }} />
                    <button onClick={addPage} style={btn('#34495e')}>+ DODAJ STRONĘ</button>
                    <button onClick={removePage} style={btn('#7f8c8d')}>- USUŃ STRONĘ</button>
                    {statusMsg && <span style={{ color: statusMsg.startsWith('✅') ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>{statusMsg}</span>}
                    <span style={{ fontSize: '11px', color: '#666', marginLeft: 'auto' }}>
                        💡 Nazwy pól w designerze: <code>nazwa_klienta</code> · <code>miasto</code> · <code>email_klienta</code> · <code>uwagi</code> · <code>data</code> · <code>numer_raportu</code>
                    </span>
                </div>
                <div ref={designerRef} style={{ flex: 1, minHeight: 0 }} />
            </div>

            {/* ── ZAKŁADKA GENEROWANIE ── */}
            {activeTab === 'generate' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '40px 20px', background: '#f5f6fa' }}>
                    <div style={{ maxWidth: '580px', margin: '0 auto', background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>Generator Raportu</h2>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Szablon:</label>
                            <select
                                value={selectedTemplateId}
                                onChange={e => setSelectedTemplateId(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                            >
                                <option value="">-- Wybierz szablon --</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Klient:</label>
                            <select
                                value={selectedClientId}
                                onChange={e => setSelectedClientId(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                            >
                                <option value="">-- Wybierz klienta --</option>
                                {clients.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                            </select>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Uwagi dodatkowe:</label>
                            <textarea
                                value={extraNotes}
                                onChange={e => setExtraNotes(e.target.value)}
                                placeholder="Wpisz uwagi, które pojawią się w PDF..."
                                style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', resize: 'vertical' }}
                            />
                        </div>

                        {/* Podgląd pól szablonu */}
                        {schemaFields.length > 0 && (
                            <div style={{ marginBottom: '20px', padding: '14px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                                <strong style={{ fontSize: '13px' }}>📋 Pola szablonu i ich wartości:</strong>
                                <table style={{ width: '100%', marginTop: '8px', fontSize: '13px', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {schemaFields.map(field => (
                                            <tr key={field} style={{ borderBottom: '1px solid #dee2e6' }}>
                                                <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: '#2c3e50' }}>{field}</td>
                                                <td style={{ padding: '4px 8px', color: fieldValues[field] ? '#555' : '#aaa' }}>
                                                    {fieldValues[field] ?? <em style={{ color: '#aaa' }}>nieznane pole — zostanie puste</em>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <button
                            onClick={handleGeneratePdf}
                            style={{ ...btn('#3498db'), width: '100%', padding: '14px', fontSize: '15px' }}
                        >
                            ⬇ POBIERZ PDF
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;