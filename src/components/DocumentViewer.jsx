import React from 'react';
import { X } from 'lucide-react';

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
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
          title="Cerrar"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Iframe contenedor */}
        <div className="w-full h-full bg-white rounded-lg shadow-xl overflow-hidden">
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