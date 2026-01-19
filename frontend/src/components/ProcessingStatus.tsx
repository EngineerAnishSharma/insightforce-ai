import './ProcessingStatus.css';

export default function ProcessingStatus() {
  return (
    <div className="processing-status">
      <div className="spinner"></div>
      <h3>Processing your sources...</h3>
      <p>This may take a few moments depending on the size of your documents</p>
    </div>
  );
}
