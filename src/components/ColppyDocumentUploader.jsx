import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DocumentViewer from './DocumentViewer';
import MessageDisplay from './MessageDisplay';
import UploadArea from './UploadArea';
import DocumentList from './DocumentList';
import useTimeoutManager from '../hooks/useTimeoutManager';
import useMessage from '../hooks/useMessage';
import useIntercom from '../hooks/useIntercom';
import { DOCUMENT_STATUS, STATE_MAPPING, TIMEOUTS } from '../utils/constants';
import { convertToBase64 } from '../utils/fileUtils';



// Main component
const ColppyDocumentUploader = ({ empresaId, email, getCookie }) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const ADDONS_URL = import.meta.env.VITE_ADDONS_URL;
  const API_COLPPY_URL = import.meta.env.VITE_API_COLPPY_URL;

  // State
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [comprobantesInfo, setComprobantesInfo] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Refs
  const intervalRef = useRef(null);
  const isCheckingStatusRef = useRef(false);

  // Custom hooks
  const timeoutManager = useTimeoutManager();
  const { message: uploadMessage, showMessage } = useMessage();

  // Intercom integration
  const intercom = useIntercom(import.meta.env.VITE_INTERCOM_APP_ID, {
    email: email,
    name: email || `Usuario ${empresaId}`,
    created_at: Math.floor(Date.now() / 1000),
    empresa_id: String(empresaId),
    creditos_disponibles: comprobantesInfo?.comprobantes_restantes || 0,
    total_documentos: documents.length
  });

  // Memoized values
  const password = useMemo(() => getCookie('loginPasswordCookie') ?? "", [getCookie]);
  const authData = useMemo(() => {
    const username = email ?? "";
    const cookiesAvailable = Boolean(username && password && empresaId);

    return {
      username,
      password,
      cookiesAvailable,
      formData: cookiesAvailable ? {
        user: username,
        claveSesion: password,
        idEmpresa: empresaId,
        endPoint: API_COLPPY_URL
      } : null
    };
  }, [email, password, empresaId, API_COLPPY_URL]);

  const canUpload = useMemo(() =>
    authData.cookiesAvailable &&
    comprobantesInfo?.canProcessFacturas !== false &&
    comprobantesInfo?.comprobantes_restantes > 0,
    [authData.cookiesAvailable, comprobantesInfo]
  );

  // Actualizar propiedades del usuario en Mixpanel (sin re-identificar)
  useEffect(() => {
    if (email && empresaId && window.mixpanel) {
      window.mixpanel.people.set({
        $email: email,
        email: email,
        name: email,
        empresa_id: String(empresaId),
        created_at: Math.floor(Date.now() / 1000),
        creditos_disponibles: comprobantesInfo?.comprobantes_restantes || 0,
        total_documentos: documents.length
      });
    }
  }, [email, empresaId, comprobantesInfo, documents.length]);

  const isLoading = useMemo(() => {
    // Si empresaId o email aún no están disponibles, seguir cargando
    if (!empresaId || !email) {
      return true;
    }

    // Si no hay cookies disponibles, no necesitamos esperar más validaciones
    if (!authData.cookiesAvailable) {
      return loading || !initialLoadComplete;
    }

    // Si hay cookies, debemos esperar a que se carguen todas las validaciones
    return loading || !initialLoadComplete || comprobantesInfo === null;
  }, [loading, initialLoadComplete, authData.cookiesAvailable, comprobantesInfo, empresaId, email]);

  const hasProcessingDocs = useMemo(() =>
    documents.some(doc =>
      doc.status === DOCUMENT_STATUS.PROCESSING &&
      doc.externalCode &&
      doc.externalCode !== 'Error - No disponible'
    ),
    [documents]
  );

  // API functions
  const checkComprobantesDisponibles = useCallback(async () => {
    if (!authData.cookiesAvailable || !empresaId) {
      setComprobantesInfo(null);
      return;
    }

    try {
      const idEmpresa = window.idEmpresaUsuario || empresaId;
      const response = await fetch(`${API_BASE_URL}/api/facturas/comprobantes/${idEmpresa}`);
      if (response.ok) {
        const data = await response.json();
        setComprobantesInfo(data);
      } else {
        console.warn('No se pudo obtener información de comprobantes');
        setComprobantesInfo(null);
      }
    } catch (error) {
      console.error('Error verificando comprobantes:', error);
      setComprobantesInfo(null);
    }
  }, [authData.cookiesAvailable, empresaId, API_BASE_URL]);

  const loadDocuments = useCallback(async () => {
    if (!authData.cookiesAvailable || !empresaId) {
      return;
    }

    try {
      const idEmpresa = window.idEmpresaUsuario || empresaId;
      const response = await fetch(`${API_BASE_URL}/api/facturas/empresa/${idEmpresa}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.facturas) setDocuments(data.facturas);
    } catch (error) {
      console.error('Error cargando documentos:', error);
      showMessage('Error al cargar documentos existentes', TIMEOUTS.MESSAGE_DURATION);
    }
  }, [authData.cookiesAvailable, empresaId, showMessage, API_BASE_URL]);


  const updateProcessingDocuments = useCallback(async () => {
    // Prevenir llamadas simultáneas
    if (isCheckingStatusRef.current) {
      return;
    }

    isCheckingStatusRef.current = true;

    try {
      // Obtener documentos del estado actual sin dependencias
      let processingDocs = [];
      setDocuments(current => {
        processingDocs = current.filter(doc =>
          doc.status === DOCUMENT_STATUS.PROCESSING &&
          doc.externalCode &&
          doc.externalCode !== 'Error - No disponible'
        );
        return current;
      });

      if (processingDocs.length === 0) {
        return;
      }

      const checkStatus = async (identifier) => {
        if (!identifier || identifier === 'Error - No disponible') return null;

        try {
          const response = await fetch(`${API_BASE_URL}/api/documents/getinfo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier })
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const responseData = await response.json();

          if (responseData.response) {
            const parsedResponse = JSON.parse(responseData.response);
            if (parsedResponse?.length > 0) {
              const docInfo = parsedResponse[0];
              return {
                identifier: docInfo.Identifier,
                state: docInfo.State,
                process: docInfo.Process,
                filename: docInfo.Filename,
                deeplink: docInfo.Deeplink,
                fullData: docInfo
              };
            }
          }
          return null;
        } catch (error) {
          console.error('Error al consultar estado del documento:', error);
          return null;
        }
      };

      const statusPromises = processingDocs.map(doc =>
        checkStatus(doc.externalCode).then(result => ({ doc, result }))
      );

      const results = await Promise.allSettled(statusPromises);

      const updates = results
        .filter(result => result.status === 'fulfilled' && result.value.result)
        .map(result => {
          const { doc, result: statusInfo } = result.value;

          let newStatus = doc.status;
          let errorMessage = null;
          const state = statusInfo.state?.toLowerCase();
          const process = statusInfo.process?.toLowerCase();

          // Verificar si hay reglas que fallaron
          const rules = statusInfo.fullData?.Rules || [];
          const failedRules = rules.filter(rule => rule.Pass === false);
          const hasFailedRules = failedRules.length > 0;

          // Si hay reglas fallidas, construir mensaje de error
          if (hasFailedRules) {
            const failedRulesText = failedRules
              .map(rule => rule.Leyend || rule.Name)
              .filter(Boolean)
              .join('; ');
            errorMessage = `Errores de validación: ${failedRulesText}`;
          }

          // Determinar estado basándose en la combinación State + Process
          if (state === 'draft' && (process === 'sent' || process === 'finished')) {
            // Draft + Sent/Finished = Procesado (verificar reglas)
            newStatus = hasFailedRules ? DOCUMENT_STATUS.ERROR : DOCUMENT_STATUS.PROCESSED;
          } else if (state === 'aproved' && process === 'finished') {
            // Aproved + Finished = Procesado (verificar reglas)
            newStatus = hasFailedRules ? DOCUMENT_STATUS.ERROR : DOCUMENT_STATUS.PROCESSED;
          } else if (state === 'rejected') {
            // Rechazado explícitamente
            newStatus = DOCUMENT_STATUS.ERROR;
          } else if (STATE_MAPPING[state]) {
            // Mapeo directo por State
            newStatus = STATE_MAPPING[state];
          } else if (STATE_MAPPING[process]) {
            // Mapeo directo por Process (fallback)
            newStatus = STATE_MAPPING[process];
          }

          // Si hay reglas fallidas, siempre forzar estado de error
          if (hasFailedRules) {
            newStatus = DOCUMENT_STATUS.ERROR;
          }

          return {
            docId: doc.id,
            updates: {
              status: newStatus,
              statusInfo,
              deeplink: statusInfo.deeplink,
              error: errorMessage || doc.error // Preservar error anterior si no hay nuevo
            }
          };
        });

      if (updates.length > 0) {
        setDocuments(prev =>
          prev.map(doc => {
            const update = updates.find(u => u.docId === doc.id);
            return update ? { ...doc, ...update.updates } : doc;
          })
        );
      }
    } catch (error) {
      console.error('Error actualizando estados de documentos:', error);
    } finally {
      isCheckingStatusRef.current = false;
    }
  }, [API_BASE_URL]);

  const uploadDocument = useCallback(async (file) => {
    if (!authData.cookiesAvailable || !authData.formData) {
      showMessage('Error: No se puede proceder sin autenticación válida', 5000);
      return false;
    }

    if (comprobantesInfo && !comprobantesInfo.canProcessFacturas) {
      showMessage('Alcanzaste el límite de créditos. Para seguir usando la funcionalidad, tenés que cargar más créditos.', 8000);
      return false;
    }

    try {
      setIsUploading(true);
      showMessage('Convirtiendo archivo a Base64...');

      const base64Document = await convertToBase64(file);

      const requestBody = {
        agent: "Facturas AR",
        document: base64Document,
        filename: file.name,
        bag: JSON.stringify(authData.formData)
      };

      showMessage('Enviando documento...');

      const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();

        if (errorData.includes('Sin creditos disponibles') ||
            errorData.includes('sin shots') ||
            errorData.includes('comprobantes restantes: 0')) {
          throw new Error('Alcanzaste el límite de créditos. Para seguir usando la funcionalidad, tenés que cargar más créditos.');
        }

        throw new Error(`Error ${response.status}: ${errorData}`);
      }

      const responseData = await response.json();

      if (!responseData.success) {
        if (responseData.message?.includes('Sin comprobantes disponibles') ||
            responseData.message?.includes('sin shots') ||
            responseData.message?.includes('comprobantes restantes')) {
          throw new Error('Alcanzaste el límite de créditos. Para seguir usando la funcionalidad, tenés que cargar más créditos.');
        }
        throw new Error('La API no confirmó una subida exitosa');
      }

      // Recargar lista de documentos y comprobantes
      // El backend ahora actualiza automáticamente los estados desde Boolfy
      await Promise.all([loadDocuments(), checkComprobantesDisponibles()]);

      showMessage('Documento subido exitosamente - Procesando...', TIMEOUTS.MESSAGE_DURATION);

      return true;
    } catch (error) {
      console.error('Error al subir documento:', error);

      const duration = error.message.includes('Alcanzaste el límite de créditos') ? 8000 : 5000;
      showMessage(`Error: ${error.message}`, duration);
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [authData.cookiesAvailable, authData.formData, showMessage, loadDocuments, checkComprobantesDisponibles, comprobantesInfo, API_BASE_URL]);

  // Event handlers

  const handleOpenDocument = useCallback((doc) => {
    setCurrentDocument(doc);
    setViewerOpen(true);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false);
    setCurrentDocument(null);
  }, []);

  // Effects
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      setInitialLoadComplete(false);

      await new Promise(resolve => setTimeout(resolve, TIMEOUTS.INIT_DELAY));
      await Promise.all([loadDocuments(), checkComprobantesDisponibles()]);

      setInitialLoadComplete(true);
      setLoading(false);
    };

    initialize();
  }, [empresaId, authData.cookiesAvailable, loadDocuments, checkComprobantesDisponibles]);

  useEffect(() => {
    // Limpiar interval anterior si existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Solo crear interval si hay documentos en procesamiento
    if (hasProcessingDocs) {
      intervalRef.current = setInterval(updateProcessingDocuments, TIMEOUTS.POLLING_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasProcessingDocs, updateProcessingDocuments]);

  useEffect(() => {
    return () => {
      timeoutManager.clearAllTimeouts();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timeoutManager]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
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
              <p style={{ color: '#6b7280', margin: 0, fontSize: '16px' }}>Inicializando...</p>
            </div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            <MessageDisplay message={uploadMessage} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <UploadArea
                canUpload={canUpload}
                isUploading={isUploading}
                authData={authData}
                comprobantesInfo={comprobantesInfo}
                addonsUrl={ADDONS_URL}
                onUpload={uploadDocument}
                showMessage={showMessage}
              />

              <DocumentList
                documents={documents}
                onOpenDocument={handleOpenDocument}
              />
            </div>

            <DocumentViewer
              document={currentDocument}
              isOpen={viewerOpen}
              onClose={handleCloseViewer}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ColppyDocumentUploader;