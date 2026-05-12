import { useState } from 'react';
import './App.css';
import { DesignTab } from './components/DesignTab.jsx';
import { GenerateTab } from './components/GenerateTab.jsx';
import { HeaderTabs } from './components/HeaderTabs.jsx';
import { useReportData } from './hooks/useReportData.js';

function App() {
  const [activeTab, setActiveTab] = useState('design');
  const reportData = useReportData();

  return (
    <div className="app-shell">
      <HeaderTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="app-content">
        {activeTab === 'design' && <DesignTab onTemplateSaved={reportData.refresh} />}
        {activeTab === 'generate' && (
          <GenerateTab
            clients={reportData.clients}
            templates={reportData.templates}
            isLoading={reportData.isLoading}
            error={reportData.error}
            onRetry={reportData.refresh}
          />
        )}
      </main>
    </div>
  );
}

export default App;
