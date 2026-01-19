import './ResetButton.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ResetButtonProps {
  onReset: () => void;
  isResetting: boolean;
}

export default function ResetButton({ onReset, isResetting }: ResetButtonProps) {
  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset? This will clear all processed data.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/reset`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to reset');
      }

      // Reload the page to reset the UI
      window.location.reload();
    } catch (err) {
      console.error('Reset error:', err);
      alert('Failed to reset. Please try again.');
    }
  };

  return (
    <div className="reset-container">
      <button
        onClick={handleReset}
        className="reset-btn"
        disabled={isResetting}
        title="Clear all processed data and start over"
      >
        {isResetting ? '⏳ Resetting...' : '🔄 Reset All'}
      </button>
      <p className="reset-help">Start over with new sources</p>
    </div>
  );
}
