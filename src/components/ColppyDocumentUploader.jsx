import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DocumentViewer from './DocumentViewer';
import MessageDisplay from './MessageDisplay';
import UploadArea from './UploadArea';
import DocumentList from './DocumentList';
import useTimeoutManager from '../hooks/useTimeoutManager';
import useMessage from '../hooks/useMessage';
import { DOCUMENT_STATUS, STATE_MAPPING, TIMEOUTS } from '../utils/constants';
import { convertToBase64 } from '../utils/fileUtils';



// Main component
const ColppyDocumentUploader = ({ empresaId, email, getCookie }) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const ADDONS_URL = import.meta.env.VITE_ADDONS_URL;

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

  // Custom hooks
  const timeoutManager = useTimeoutManager();
  const { message: uploadMessage, showMessage } = useMessage(timeoutManager);

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
        pass: password,
        idEmpresa: empresaId,
        endPoint: 'https://staging.colppy.com/lib/frontera2/service.php'
      } : null
    };
  }, [email, password, empresaId]);

  const canUpload = useMemo(() =>
    authData.cookiesAvailable &&
    comprobantesInfo?.canProcessFacturas !== false &&
    comprobantesInfo?.comprobantes_restantes > 0,
    [authData.cookiesAvailable, comprobantesInfo]
  );

  const isLoading = useMemo(() => {
    // Si no hay cookies disponibles, no necesitamos esperar más validaciones
    if (!authData.cookiesAvailable) {
      return loading || !initialLoadComplete;
    }

    // Si hay cookies, debemos esperar a que se carguen todas las validaciones
    return loading || !initialLoadComplete || comprobantesInfo === null;
  }, [loading, initialLoadComplete, authData.cookiesAvailable, comprobantesInfo]);

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
      const response = await fetch(`${API_BASE_URL}/api/facturas/comprobantes/${empresaId}`);
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
      const response = await fetch(`${API_BASE_URL}/api/facturas/empresa/${empresaId}`, {
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
    setDocuments(currentDocs => {
      const processingDocs = currentDocs.filter(doc =>
        doc.status === DOCUMENT_STATUS.PROCESSING &&
        doc.externalCode &&
        doc.externalCode !== 'Error - No disponible'
      );

      if (processingDocs.length === 0) return currentDocs;

      // Actualizar estados de forma asíncrona sin depender del estado actual
      (async () => {
        try {
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
              const state = statusInfo.state?.toLowerCase();
              const process = statusInfo.process?.toLowerCase();

              // Priorizar el estado sobre el proceso
              if (STATE_MAPPING[state]) {
                newStatus = STATE_MAPPING[state];
              } else if (STATE_MAPPING[process]) {
                newStatus = STATE_MAPPING[process];
              } else if (process === 'finished' || process === 'done') {
                newStatus = DOCUMENT_STATUS.PROCESSED;
              } else if (process === 'failed' || state === 'error') {
                newStatus = DOCUMENT_STATUS.ERROR;
              }

              return {
                docId: doc.id,
                updates: {
                  status: newStatus,
                  statusInfo,
                  deeplink: statusInfo.deeplink
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
        }
      })();

      return currentDocs;
    });
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

      showMessage('Enviando documento a la API...');

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

      showMessage('Documento subido exitosamente - Procesando...', TIMEOUTS.MESSAGE_DURATION);

      await Promise.all([loadDocuments(), checkComprobantesDisponibles()]);

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
  }, [empresaId, authData.cookiesAvailable]);

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <MessageDisplay message={uploadMessage} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <UploadArea
            canUpload={canUpload}
            isLoading={isLoading}
            isUploading={isUploading}
            authData={authData}
            comprobantesInfo={comprobantesInfo}
            addonsUrl={ADDONS_URL}
            onUpload={uploadDocument}
            showMessage={showMessage}
          />

          <DocumentList
            documents={documents}
            loading={loading}
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

export default ColppyDocumentUploader;