import { useState } from 'react';
import './QASection.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface QueryResult {
  status: string;
  answer: string;
  sources: string[];
}

interface QASectionProps {
  onQueryStart: () => void;
  onQueryResult: (result: QueryResult) => void;
  isQuerying: boolean;
  queryResult: QueryResult | null;
}

export default function QASection({
  onQueryStart,
  onQueryResult,
  isQuerying,
  queryResult,
}: QASectionProps) {
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<{ q: string; a: QueryResult }[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    onQueryStart();
    setError('');

    try {
      const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: question.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to query documents');
      }

      const result = await response.json();
      onQueryResult(result);
      setHistory([{ q: question, a: result }, ...history]);
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      onQueryResult({ status: 'error', answer: '', sources: [] });
    }
  };

  return (
    <div className="qa-section-container">
      <form onSubmit={handleSubmit} className="query-form">
        <div className="input-group">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your documents..."
            className="query-input"
            disabled={isQuerying}
          />
          <button
            type="submit"
            className="query-btn"
            disabled={isQuerying}
          >
            {isQuerying ? '⏳ Searching...' : '🔍 Ask'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
      </form>

      {/* Current Query Result */}
      {queryResult && !isQuerying && (
        <div className={`query-result ${queryResult.status}`}>
          <div className="result-header">
            <h3>Answer</h3>
            <span className={`status-badge ${queryResult.status}`}>
              {queryResult.status === 'success' ? '✓ Complete' : '⚠ Error'}
            </span>
          </div>

          <div className="result-content">
            <p className="answer-text">{queryResult.answer}</p>

            {queryResult.sources && queryResult.sources.length > 0 && (
              <div className="sources-section">
                <h4>📚 Sources:</h4>
                <ul className="sources-list">
                  {queryResult.sources.map((source, index) => (
                    <li key={index} className="source-item">
                      {source}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {isQuerying && (
        <div className="querying-spinner">
          <div className="spinner"></div>
          <p>Searching through your documents...</p>
        </div>
      )}

      {/* Query History */}
      {history.length > 0 && (
        <div className="history-section">
          <h3>Previous Questions</h3>
          <div className="history-list">
            {history.map((item, index) => (
              <div key={index} className="history-item">
                <div className="history-question">
                  <span className="q-label">Q:</span>
                  <p>{item.q}</p>
                </div>
                <div className="history-answer">
                  <span className="a-label">A:</span>
                  <p>{item.a.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
