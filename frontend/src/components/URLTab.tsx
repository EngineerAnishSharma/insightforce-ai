import { useState } from 'react';
import './URLTab.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface URLTabProps {
  onProcessingStart: () => void;
  onProcessingComplete: (result: any) => void;
  isProcessing: boolean;
}

export default function URLTab({ onProcessingStart, onProcessingComplete, isProcessing }: URLTabProps) {
  const [urls, setUrls] = useState(['']);
  const [error, setError] = useState('');

  const addURLField = () => {
    setUrls([...urls, '']);
    setError('');
  };

  const removeURLField = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls);
  };

  const updateURL = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validUrls = urls.filter(url => url.trim());
    
    if (validUrls.length === 0) {
      setError('Please enter at least one URL');
      return;
    }

    // Validate URLs
    try {
      validUrls.forEach(url => {
        new URL(url);
      });
    } catch {
      setError('Please enter valid URLs (e.g., https://example.com)');
      return;
    }

    onProcessingStart();
    setError('');

    try {
      const response = await fetch(`${API_URL}/process-urls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: validUrls }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to process URLs');
      }

      const result = await response.json();
      onProcessingComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      onProcessingComplete({ status: 'error', message: 'Processing failed' });
    }
  };

  return (
    <div className="url-tab">
      <form onSubmit={handleSubmit} className="url-form">
        <div className="url-fields">
          {urls.map((url, index) => (
            <div key={index} className="url-field">
              <input
                type="url"
                value={url}
                onChange={(e) => updateURL(index, e.target.value)}
                placeholder="https://example.com"
                className="url-input"
                disabled={isProcessing}
              />
              {urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeURLField(index)}
                  className="remove-btn"
                  disabled={isProcessing}
                  title="Remove this URL"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="url-actions">
          <button
            type="button"
            onClick={addURLField}
            className="add-btn"
            disabled={isProcessing}
          >
            + Add Another URL
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          type="submit"
          className="submit-btn"
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing URLs...' : 'Process URLs'}
        </button>
      </form>

      <div className="url-info">
        <h4>ℹ️ Tips:</h4>
        <ul>
          <li>Enter valid HTTPS URLs</li>
          <li>Add multiple URLs to process together</li>
          <li>Processing may take a few moments</li>
          <li>Supported formats: Web pages, PDFs, etc.</li>
        </ul>
      </div>
    </div>
  );
}
