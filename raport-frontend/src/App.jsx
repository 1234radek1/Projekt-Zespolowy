import { useRef, useEffect, useState } from 'react';
import { Designer } from '@pdfme/ui';
import { generate } from '@pdfme/generator';
import { text, image, barcodes } from '@pdfme/schemas';

const BLANK_PDF = 'data:application/pdf;base64,JVBERi0xLjQKJeb39/RyCjEgMCBvYmogPDwgL1R5cGUgL0NhdGFsb2cgL1BhZ2VzIDIgMCBSID4+IGVuZG9iagoyIDAgb2JqIDw8IC9UeXBlIC9QYWdlcyAvS2lkcyBbIDMgMCBSIF0gL0NvdW50IDEgPj4gZW5kb2JqCjMgMCBvYmogPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvUmVzb3VyY2VzIDw8ID4+IC9NZWRpYUJveCBbIDAgMCA1OTUuMjggODQxLjg5IF0gL0NvbnRlbnRzIDQgMCBSID4+IGVuZG9iago0IDAgb2JqIDw8IC9MZW5ndGggMCA+PiBzdHJlYW0KZW5kc3RyZWFtIGVuZG9iagp0cmFpbGVyIDw8IC9Sb290IDEgMCBSIC9TaXplIDUgPj4KJSVFT0Y=';
const API_URL = 'http://localhost:5000/api';
const PLUGINS = { text, image, qrcode: barcodes.qrcode };

const btn = (bg) => ({
    background: bg, color: 'white', border: 'none',
    padding: '8px 18px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold',
});

function App() {
    const [activeTab, setActiveTab] = useState('design');
    const [templates, setTemplates] = useState([]);
    const [clients, setClients] = useState([]);
    const [reportName, setReportName] = useState('Nowy Szablon');
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

    useEffect(() => {
        if (!designerRef.current || designerInstance.current) return;
        designerInstance.current = new Designer({
            domContainer: designerRef.current,
            template: { basePdf: BLANK_PDF, schemas: [{}] },
            plugins: PLUGINS,
        });
        return () => {
            designerInstance.current?.destroy();
            designerInstance.current = null;
        };
    }, []);

    const saveTemplate = async () => {
        if (!designerInstance.current) return;
        const tmpl = designerInstance.current.getTemplate();
        try {
            const res = await fetch(`${API_URL}/templates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: reportName, schemaContent: JSON.stringify(tmpl) }),
            });
            if (res.ok) { flash('✅ Zapisano!'); fetchData(); }
            else flash(`❌ Błąd zapisu: ${res.status}`);
        } catch {
            flash('❌ Brak połączenia z backendem');
        }
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

        const inputRecord = {};
        for (const page of (parsedTemplate.schemas ?? [])) {
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
                    <input
                        value={reportName}
                        onChange={e => setReportName(e.target.value)}
                        style={{ padding: '6px', width: '220px', borderRadius: '4px', border: '1px solid #ccc' }}
                        placeholder="Nazwa szablonu"
                    />
                    <button onClick={saveTemplate} style={btn('#27ae60')}>ZAPISZ</button>
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