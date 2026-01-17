import { useState } from 'react'
import './App.css'

const API_BASE_URL = 'http://localhost:8000'

interface QueryResponse {
  status: string
  answer: string
  sources: string[]
}

interface ProcessResponse {
  status: string
  message: string
  documents_loaded: number
  urls_processed: number
  files_processed: number
}

type TabType = 'upload' | 'query' | 'both'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('both')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Upload states
  const [urls, setUrls] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)

  // Query states
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState<QueryResponse | null>(null)

  const clearMessages = () => {
    setError('')
    setSuccessMsg('')
  }

  const handleUpload = async () => {
    clearMessages()
    setLoading(true)

    try {
      const formData = new FormData()

      // Add URLs
      if (urls.trim()) {
        const urlList = urls
          .split('\n')
          .map(u => u.trim())
          .filter(u => u)
        formData.append('urls', JSON.stringify(urlList))
      }

      // Add files
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          formData.append('files', files[i])
        }
      }

      // Validate
      if (!urls.trim() && (!files || files.length === 0)) {
        setError('Please provide at least one URL or file')
        setLoading(false)
        return
      }

      const res = await fetch(`${API_BASE_URL}/process-sources`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || 'Failed to process sources')
      }

      const data: ProcessResponse = await res.json()
      setSuccessMsg(
        `✓ Successfully processed ${data.documents_loaded} documents (${data.urls_processed} URLs, ${data.files_processed} files)`
      )
      setUrls('')
      setFiles(null)
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleQuery = async () => {
    clearMessages()
    if (!question.trim()) {
      setError('Please enter a question')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || 'Failed to query documents')
      }

      const data: QueryResponse = await res.json()
      setResponse(data)
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!window.confirm('This will delete all processed documents. Continue?')) return

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/reset`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to reset')
      setSuccessMsg('✓ All data cleared successfully')
      setResponse(null)
      setQuestion('')
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 InsightForce AI</h1>
        <p className="subtitle">AI-Powered Document & Web Research Assistant</p>
      </header>

      <div className="container">
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            📤 Upload Sources
          </button>
          <button
            className={`tab-btn ${activeTab === 'query' ? 'active' : ''}`}
            onClick={() => setActiveTab('query')}
          >
            ❓ Query Documents
          </button>
          <button
            className={`tab-btn ${activeTab === 'both' ? 'active' : ''}`}
            onClick={() => setActiveTab('both')}
          >
            🔄 Combined View
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        <div className="content">
          {(activeTab === 'upload' || activeTab === 'both') && (
            <div className="panel upload-panel">
              <h2>📚 Upload Sources</h2>

              <div className="form-group">
                <label>URLs (one per line)</label>
                <textarea
                  placeholder="https://example.com&#10;https://another-website.com"
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  className="textarea-field"
                  rows={4}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Upload Files (PDF, CSV, TXT, DOCX)</label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="file-input"
                  disabled={loading}
                  accept=".pdf,.csv,.txt,.docx"
                />
                {files && files.length > 0 && (
                  <div className="file-list">
                    {Array.from(files).map((file, idx) => (
                      <span key={idx} className="file-badge">
                        📄 {file.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="button-group">
                <button
                  onClick={handleUpload}
                  disabled={loading || (!urls.trim() && (!files || files.length === 0))}
                  className="btn-primary"
                >
                  {loading ? '⏳ Processing...' : '📤 Process Sources'}
                </button>
                <button onClick={handleReset} disabled={loading} className="btn-secondary">
                  🔄 Clear All Data
                </button>
              </div>
            </div>
          )}

          {(activeTab === 'query' || activeTab === 'both') && (
            <div className="panel query-panel">
              <h2>❓ Ask Questions</h2>

              <div className="form-group">
                <label>Your Question</label>
                <textarea
                  placeholder="Ask anything about your documents..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="textarea-field"
                  rows={4}
                  disabled={loading}
                />
              </div>

              <button
                onClick={handleQuery}
                disabled={loading || !question.trim()}
                className="btn-primary"
              >
                {loading ? '⏳ Searching...' : '🔍 Search & Get Answer'}
              </button>

              {response && (
                <div className="response-container">
                  <h3>📝 Answer</h3>
                  <div className="response-text">{response.answer}</div>

                  {response.sources && response.sources.length > 0 && (
                    <div className="sources-section">
                      <h4>📚 Sources</h4>
                      <ul className="sources-list">
                        {response.sources.map((source, idx) => (
                          <li key={idx}>{source}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="app-footer">
        <p>🔗 Backend: {API_BASE_URL}</p>
      </footer>
    </div>
  )
}

export default App
