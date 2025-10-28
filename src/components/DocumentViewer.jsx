import { X } from 'lucide-react';

const DocumentViewer = ({ document, isOpen, onClose }) => {
  if (!isOpen || !document?.deeplink) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={handleBackdropClick}>
      <div className="relative w-full h-full p-4 md:p-8">
        {/* Header profesional con información del documento */}
        <div className="absolute top-4 md:top-8 left-4 md:left-8 right-4 md:right-8 z-10 bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">
                {document.filename || 'Documento Procesado'}
              </h2>
              {document.externalCode && (
                <p className="text-xs text-gray-600">
                  Código: <span className="font-mono text-gray-700">{document.externalCode}</span>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-colppy hover:bg-colppy-hover text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-colppy"
            >
              <X className="w-4 h-4" strokeWidth={2} />
              Cerrar
            </button>
          </div>
        </div>

        {/* Iframe contenedor con espacio para el header */}
        <div className="w-full h-full bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200" style={{ paddingTop: '88px' }}>
          <iframe
            src={document.deeplink}
            className="w-full h-full"
            style={{ border: 'none' }}
            title={document.filename || 'Documento'}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
