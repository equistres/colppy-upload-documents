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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Banner informativo sobre feature experimental */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '0.5rem' }}>🤖 ✨</div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '20px', fontWeight: '600' }}>
            Feature Experimental con IA
          </h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '14px', opacity: 0.9 }}>
            Esta es una demostración de nuestra nueva funcionalidad de procesamiento de facturas con Inteligencia Artificial
          </p>
          <button
            onClick={handleInterestClick}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid white',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ¿Te interesa esta funcionalidad?
          </button>
        </div>

        <MessageDisplay message={uploadMessage} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
