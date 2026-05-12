const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

async function requestJson(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export function getTemplates() {
  return requestJson('/templates');
}

export function getClients() {
  return requestJson('/data/clients');
}

export function createTemplate(template) {
  return requestJson('/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
}
