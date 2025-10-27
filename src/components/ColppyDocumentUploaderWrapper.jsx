import ColppyDocumentUploader from './ColppyDocumentUploader';
import ColppyDocumentUploaderDemo from './ColppyDocumentUploaderDemo';
import useFeatureFlag from '../hooks/useFeatureFlag';

const ColppyDocumentUploaderWrapper = ({ empresaId, email, getCookie }) => {
  const ADDONS_URL = import.meta.env.VITE_ADDONS_URL;

  // Feature flag check usando empresaId
  const [isFeatureEnabled, isLoadingFlag] = useFeatureFlag('colppy-boolfy', empresaId);

  // Mientras carga el feature flag, mostrar loader
  if (isLoadingFlag) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            <div style={{
              background: 'white',
              padding: '3rem',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid #e5e7eb',
                borderTop: '3px solid #6633cc',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem'
              }}></div>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '16px' }}>Cargando...</p>
            </div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  // Si el feature flag no está habilitado, mostrar demo
  if (!isFeatureEnabled) {
    return <ColppyDocumentUploaderDemo addonsUrl={ADDONS_URL} />;
  }

  // Si está habilitado, mostrar componente real
  return <ColppyDocumentUploader empresaId={empresaId} email={email} getCookie={getCookie} />;
};

export default ColppyDocumentUploaderWrapper;
