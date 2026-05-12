import { useCallback, useEffect, useState } from 'react';
import { getClients, getTemplates } from '../api/reportApi.js';

export function useReportData() {
  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [nextTemplates, nextClients] = await Promise.all([getTemplates(), getClients()]);
      setTemplates(nextTemplates);
      setClients(nextClients);
    } catch {
      setError('Nie udało się pobrać danych z backendu.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    clients,
    error,
    isLoading,
    refresh,
    templates,
  };
}
