const DocumentViewer = ({ document, isOpen, onClose }) => {
  if (!isOpen || !document?.deeplink) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={handleBackdropClick}>
      <div className="relative w-full h-full p-4">
        {/* Iframe contenedor */}
        <div className="w-full h-full bg-white rounded-lg shadow-xl overflow-hidden">
          <iframe
            src={document.deeplink}
            className="w-full h-full"
            style={{ border: 'none' }}
            title={document.filename || 'Documento'}
          />
        </div>

        {/* Botón cerrar en esquina inferior derecha */}
        <button
          onClick={onClose}
          className="absolute bottom-8 right-8 z-10 px-6 py-3 text-white font-semibold rounded-lg shadow-lg hover:opacity-90 transition-opacity"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default DocumentViewer;