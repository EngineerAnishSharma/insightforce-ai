import { useState } from 'react';
import './FileTab.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface FileTabProps {
  onProcessingStart: () => void;
  onProcessingComplete: (result: any) => void;
  isProcessing: boolean;
}

export default function FileTab({ onProcessingStart, onProcessingComplete, isProcessing }: FileTabProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const ALLOWED_TYPES = [
    'application/pdf',
    'text/csv',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const validateFile = (file: File): boolean => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError(`File "${file.name}" is too large (max 50MB)`);
      return false;
    }
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|csv|txt|docx)$/i)) {
      setError(`File type not supported: ${file.type || file.name.split('.').pop()}`);
      return false;
    }
    return true;
  };

  const handleFileSelect = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const validFiles: File[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      if (validateFile(newFiles[i])) {
        validFiles.push(newFiles[i]);
      }
    }

    if (validFiles.length > 0) {
      setFiles([...files, ...validFiles]);
      setError('');
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    setError('');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    onProcessingStart();
    setError('');

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`${API_URL}/process-files`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to process files');
      }

      const result = await response.json();
      onProcessingComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      onProcessingComplete({ status: 'error', message: 'Processing failed' });
    }
  };

  return (
    <div className="file-tab">
      <form onSubmit={handleSubmit} className="file-form">
        <div
          className={`drop-zone ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-input"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={isProcessing}
            className="file-input"
            accept=".pdf,.csv,.txt,.docx"
          />
          <label htmlFor="file-input" className="drop-label">
            <div className="drop-icon">📄</div>
            <p className="drop-title">Drag files here or click to browse</p>
            <p className="drop-subtitle">Supported: PDF, CSV, TXT, DOCX (max 50MB each)</p>
          </label>
        </div>

        {files.length > 0 && (
          <div className="files-list">
            <h4>Selected Files ({files.length})</h4>
            <ul>
              {files.map((file, index) => (
                <li key={index} className="file-item">
                  <span className="file-icon">📎</span>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="remove-btn"
                    disabled={isProcessing}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <button
          type="submit"
          className="submit-btn"
          disabled={isProcessing || files.length === 0}
        >
          {isProcessing ? 'Processing Files...' : 'Process Files'}
        </button>
      </form>

      <div className="file-info">
        <h4>ℹ️ Tips:</h4>
        <ul>
          <li>Select multiple files at once</li>
          <li>Maximum file size: 50MB each</li>
          <li>Supported formats: PDF, CSV, TXT, DOCX</li>
          <li>Processing time depends on file size</li>
        </ul>
      </div>
    </div>
  );
}
