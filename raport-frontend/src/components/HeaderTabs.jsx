const TABS = [
  { id: 'design', label: 'Projektowanie' },
  { id: 'generate', label: 'Generowanie' },
];

export function HeaderTabs({ activeTab, onTabChange }) {
  return (
    <header className="app-header">
      <nav className="tabs" aria-label="Główna nawigacja">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'tab-button-active' : ''}`}
            type="button"
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
