import { useState } from 'react';
import './App.css';
import TabNavigation from './components/TabNavigation';
import URLTab from './components/URLTab';
import FileTab from './components/FileTab';
import ProcessingStatus from './components/ProcessingStatus';
import QASection from './components/QASection';
import ResetButton from './components/ResetButton';

interface ProcessingResult {
  status: string;
  message: string;
  documents_loaded: number;
  urls_processed: number;
  files_processed: number;
}

interface QueryResult {
  status: string;
  answer: string;
  sources: string[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'url' | 'file'>('url');
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [isReset, setIsReset] = useState(false);

  const handleProcessingComplete = (result: ProcessingResult) => {
    setProcessingResult(result);
    setIsProcessing(false);
  };

  const handleProcessingStart = () => {
    setIsProcessing(true);
  };

  const handleQueryResult = (result: QueryResult) => {
    setQueryResult(result);
    setIsQuerying(false);
  };

  const handleQueryStart = () => {
    setIsQuerying(true);
  };

  const handleReset = () => {
    setIsReset(true);
    setProcessingResult(null);
    setQueryResult(null);
    setTimeout(() => setIsReset(false), 2000);
  };

  const isSourceProcessed = processingResult !== null && processingResult.status === 'success';

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>InsightForce AI</h1>
          <p className="subtitle">AI-Powered Document & Web Research Assistant</p>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          {/* Processing Section */}
          {!isSourceProcessed ? (
            <section className="processing-section">
              <div className="section-header">
                <h2>Step 1: Add Your Sources</h2>
                <p>Choose between URL links or file uploads to process your data</p>
              </div>

              <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

              <div className="tab-content">
                {activeTab === 'url' ? (
                  <URLTab
                    onProcessingStart={handleProcessingStart}
                    onProcessingComplete={handleProcessingComplete}
                    isProcessing={isProcessing}
                  />
                ) : (
                  <FileTab
                    onProcessingStart={handleProcessingStart}
                    onProcessingComplete={handleProcessingComplete}
                    isProcessing={isProcessing}
                  />
                )}
              </div>

              {isProcessing && <ProcessingStatus />}

              {processingResult && !isProcessing && (
                <div
                  className={`result-message ${processingResult.status === 'success' ? 'success' : 'error'}`}
                >
                  <h3>{processingResult.message}</h3>
                  {processingResult.status === 'success' && (
                    <div className="result-details">
                      <p>📄 Documents loaded: <strong>{processingResult.documents_loaded}</strong></p>
                      {processingResult.urls_processed > 0 && (
                        <p>🔗 URLs processed: <strong>{processingResult.urls_processed}</strong></p>
                      )}
                      {processingResult.files_processed > 0 && (
                        <p>📁 Files processed: <strong>{processingResult.files_processed}</strong></p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          ) : (
            <>
              {/* Success Banner */}
              <div className="success-banner">
                <div className="banner-content">
                  <h3>✓ Sources Successfully Processed!</h3>
                  <p>Now ask questions about your documents</p>
                </div>
              </div>

              {/* QA Section */}
              <section className="qa-section">
                <div className="section-header">
                  <h2>Step 2: Ask Questions</h2>
                  <p>Query your processed documents for insights</p>
                </div>

                <QASection
                  onQueryStart={handleQueryStart}
                  onQueryResult={handleQueryResult}
                  isQuerying={isQuerying}
                  queryResult={queryResult}
                />
              </section>

              {/* Reset Button */}
              <section className="reset-section">
                <ResetButton onReset={handleReset} isResetting={isReset} />
              </section>
            </>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>&copy; 2026 InsightForce AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
