import { useState, useCallback } from 'react';
import DocumentViewer from './DocumentViewer';
import MessageDisplay from './MessageDisplay';
import UploadAreaDemo from './UploadAreaDemo';
import DocumentList from './DocumentList';
import useMessage from '../hooks/useMessage';
import { DOCUMENT_STATUS } from '../utils/constants';

// Componente para modo DEMO - Empresas NO habilitadas
const ColppyDocumentUploaderDemo = ({ addonsUrl }) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const { message: uploadMessage, showMessage } = useMessage();

  // Documentos ficticios para el product tour: 1 procesado, 1 procesando, 1 error
  const mockDocuments = [
    {
      id: 'mock-1',
      filename: 'Factura_Ejemplo_001.pdf',
      uploadDate: new Date(Date.now() - 172800000).toISOString(), // 2 días atrás
      status: DOCUMENT_STATUS.PROCESSED,
      url: 'https://via.placeholder.com/800x1000/48bb78/ffffff?text=Factura+Procesada',
      externalCode: 'DEMO-001',
      deeplink: '#demo' // Deeplink fake para que se muestre el ojito
    },
    {
      id: 'mock-2',
      filename: 'Comprobante_Demo_002.pdf',
      uploadDate: new Date(Date.now() - 86400000).toISOString(), // 1 día atrás
      status: DOCUMENT_STATUS.PROCESSING,
      url: 'https://via.placeholder.com/800x1000/fbbf24/ffffff?text=Procesando...',
      externalCode: 'DEMO-002',
      deeplink: '#demo' // Deeplink fake para que se muestre el ojito
    },
    {
      id: 'mock-3',
      filename: 'Recibo_Error_003.pdf',
      uploadDate: new Date().toISOString(), // Hoy
      status: DOCUMENT_STATUS.ERROR,
      url: 'https://via.placeholder.com/800x1000/ef4444/ffffff?text=Error+en+Documento',
      externalCode: 'DEMO-003',
      error: 'Error de validación: El documento no contiene información fiscal válida',
      deeplink: '#demo' // Deeplink fake para que se muestre el ojito
    }
  ];

  const handleOpenDocument = useCallback(() => {
    // En modo demo, solo mostrar mensaje
    showMessage('Modo demo: Esta funcionalidad estará disponible próximamente', 3000);
  }, [showMessage]);

  const handleInterestClick = useCallback(() => {
    // Track event - Se envía automáticamente a Mixpanel e Intercom
    if (typeof window.trackEvent !== 'undefined') {
      window.trackEvent('Boolfy - Interés en Demo', {
        'timestamp': new Date().toISOString(),
        'source': 'demo-banner'
      });
    }

    showMessage('¡Gracias por tu interés! Nos pondremos en contacto contigo pronto.', 4000);
  }, [showMessage]);

  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false);
    setCurrentDocument(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Banner informativo profesional */}
        <div className="bg-white rounded-xl border border-purple-200 shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-br from-colppy to-purple-700 px-6 py-5">
            <h3 className="text-white text-base font-semibold mb-2">
              Nueva Funcionalidad con Inteligencia Artificial
            </h3>
            <p className="text-purple-100 text-sm leading-relaxed mb-4">
              Esto es una demostración de una funcionalidad en desarrollo que usa inteligencia artificial para procesar facturas automáticamente.
            </p>
            <button
              onClick={handleInterestClick}
              className="px-5 py-2.5 bg-white text-colppy text-sm font-medium rounded-lg hover:bg-gray-50 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
            >
              Quiero probarla
            </button>
          </div>
        </div>

        <MessageDisplay message={uploadMessage} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UploadAreaDemo
            addonsUrl={addonsUrl}
            showMessage={showMessage}
          />

          <DocumentList
            documents={mockDocuments}
            onOpenDocument={handleOpenDocument}
          />
        </div>

        <DocumentViewer
          document={currentDocument}
          isOpen={viewerOpen}
          onClose={handleCloseViewer}
        />
      </div>
    </div>
  );
};

export default ColppyDocumentUploaderDemo;
