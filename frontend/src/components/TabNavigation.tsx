import './TabNavigation.css';

interface TabNavigationProps {
  activeTab: 'url' | 'file';
  setActiveTab: (tab: 'url' | 'file') => void;
}

export default function TabNavigation({ activeTab, setActiveTab }: TabNavigationProps) {
  return (
    <div className="tab-navigation">
      <button
        className={`tab-btn ${activeTab === 'url' ? 'active' : ''}`}
        onClick={() => setActiveTab('url')}
      >
        <span className="tab-icon">🔗</span>
        <span className="tab-label">URL Based</span>
      </button>
      <button
        className={`tab-btn ${activeTab === 'file' ? 'active' : ''}`}
        onClick={() => setActiveTab('file')}
      >
        <span className="tab-icon">📁</span>
        <span className="tab-label">File Based</span>
      </button>
    </div>
  );
}
