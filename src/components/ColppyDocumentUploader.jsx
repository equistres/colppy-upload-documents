import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Upload, FileText, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import DocumentViewer from './DocumentViewer';

// Constants
const DOCUMENT_STATUS = {
  PROCESSED: 'processed',
  PROCESSING: 'processing',
  ERROR: 'error',
  PENDING: 'pending'
};

const STATE_MAPPING = {
  completed: DOCUMENT_STATUS.PROCESSED,
  rejected: DOCUMENT_STATUS.ERROR,
  processing: DOCUMENT_STATUS.PROCESSING,
  uploaded: DOCUMENT_STATUS.PROCESSING,
  pending: DOCUMENT_STATUS.PENDING,
  finished: DOCUMENT_STATUS.PROCESSED,
  done: DOCUMENT_STATUS.PROCESSED,
  success: DOCUMENT_STATUS.PROCESSED,
  error: DOCUMENT_STATUS.ERROR,
  failed: DOCUMENT_STATUS.ERROR
};

const MESSAGE_TYPES = {
  ERROR: 'error',
  SUCCESS: 'success',
  INFO: 'info'
};

const FILE_CONSTRAINTS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ACCEPTED_TYPE: 'application/pdf'
};

const TIMEOUTS = {
  MESSAGE_DURATION: 3000,
  POLLING_INTERVAL: 10000, // Reducido de 45s a 10s para debug
  INIT_DELAY: 1000
};

// Custom hooks
const useTimeoutManager = () => {
  const timeoutRefs = useRef([]);

  const addTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(() => {
      callback();
      timeoutRefs.current = timeoutRefs.current.filter(id => id !== timeoutId);
    }, delay);
    timeoutRefs.current.push(timeoutId);
    return timeoutId;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current = [];
  }, []);

  return { addTimeout, clearAllTimeouts };
};

const useMessage = (timeoutManager) => {
  const [message, setMessage] = useState('');

  const showMessage = useCallback((text, duration = TIMEOUTS.MESSAGE_DURATION) => {
    setMessage(text);
    timeoutManager.addTimeout(() => setMessage(''), duration);
  }, [timeoutManager]);

  return { message, showMessage };
};

// Utility functions
const getMessageType = (message) => {
  if (message.includes('Error')) return MESSAGE_TYPES.ERROR;
  if (message.includes('exitosamente') || message.includes('correctamente')) return MESSAGE_TYPES.SUCCESS;
  return MESSAGE_TYPES.INFO;
};

const getMessageStyles = (type) => {
  const styles = {
    [MESSAGE_TYPES.ERROR]: 'bg-red-50 border border-red-200 text-red-800',
    [MESSAGE_TYPES.SUCCESS]: 'bg-green-50 border border-green-200 text-green-800',
    [MESSAGE_TYPES.INFO]: 'bg-blue-50 border border-blue-200 text-blue-800'
  };
  return styles[type] || styles[MESSAGE_TYPES.INFO];
};

const getMessageIcon = (type) => {
  const icons = {
    [MESSAGE_TYPES.ERROR]: XCircle,
    [MESSAGE_TYPES.SUCCESS]: CheckCircle,
    [MESSAGE_TYPES.INFO]: Clock
  };
  const IconComponent = icons[type] || Clock;
  return <IconComponent className="w-5 h-5 mr-2" />;
};

const getStatusIcon = (status) => {
  const icons = {
    [DOCUMENT_STATUS.PROCESSED]: <CheckCircle className="w-5 h-5 text-green-500" />,
    [DOCUMENT_STATUS.PROCESSING]: <Clock className="w-5 h-5 text-yellow-500 animate-spin" />,
    [DOCUMENT_STATUS.ERROR]: <XCircle className="w-5 h-5 text-red-500" />,
    default: <AlertCircle className="w-5 h-5 text-gray-500" />
  };
  return icons[status] || icons.default;
};

const getStatusText = (status) => {
  const texts = {
    [DOCUMENT_STATUS.PROCESSED]: 'Procesado',
    [DOCUMENT_STATUS.PROCESSING]: 'Procesando',
    [DOCUMENT_STATUS.ERROR]: 'Error',
    default: 'Desconocido'
  };
  return texts[status] || texts.default;
};

const getStatusColor = (status) => {
  const colors = {
    [DOCUMENT_STATUS.PROCESSED]: 'bg-green-100 text-green-800 border-green-200',
    [DOCUMENT_STATUS.PROCESSING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [DOCUMENT_STATUS.ERROR]: 'bg-red-100 text-red-800 border-red-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[status] || colors.default;
};

const validateFile = (file) => {
  if (file.type !== FILE_CONSTRAINTS.ACCEPTED_TYPE) {
    return 'Error: Por favor, selecciona solo archivos PDF';
  }
  if (file.size > FILE_CONSTRAINTS.MAX_SIZE) {
    return 'Error: El archivo es demasiado grande (máximo 10MB)';
  }
  return null;
};

const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      try {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } catch (error) {
        reject(new Error('Error al procesar el archivo'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
  });
};

const formatFileSize = (bytes) => Math.round(bytes / 1024);

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('es-ES'),
    time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  };
};

// Main component
const ColppyDocumentUploader = ({ empresaId, email, getCookie }) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const ADDONS_URL = import.meta.env.VITE_ADDONS_URL;

  // State
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
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

  const isLoading = useMemo(() =>
    !initialLoadComplete || (authData.cookiesAvailable && comprobantesInfo === null),
    [initialLoadComplete, authData.cookiesAvailable, comprobantesInfo]
  );

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
      setLoading(false);
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
    } finally {
      setLoading(false);
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
      setSelectedFile(null);
    }
  }, [authData.cookiesAvailable, authData.formData, convertToBase64, showMessage, loadDocuments, checkComprobantesDisponibles, comprobantesInfo, API_BASE_URL]);

  // Event handlers
  const handleFileSelect = useCallback((file) => {
    if (!canUpload) {
      const message = !authData.cookiesAvailable
        ? 'Error: No se pueden procesar archivos sin autenticación'
        : 'Error: Alcanzaste el límite de créditos';
      showMessage(message, 5000);
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      showMessage(validationError);
      return;
    }

    setSelectedFile(file);
    showMessage(`Archivo seleccionado: ${file.name}`);
  }, [canUpload, authData.cookiesAvailable, showMessage]);

  const handleUpload = useCallback(async () => {
    if (!canUpload) {
      const message = !authData.cookiesAvailable
        ? 'Error: No se puede subir sin autenticación'
        : 'Error: Alcanzaste el límite de créditos';
      showMessage(message);
      return;
    }

    if (!selectedFile) {
      showMessage('Error: No hay archivo seleccionado');
      return;
    }

    await uploadDocument(selectedFile);
  }, [canUpload, authData.cookiesAvailable, selectedFile, uploadDocument, showMessage]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (canUpload) setDragActive(true);
  }, [canUpload]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);

    if (!canUpload) return;

    const files = e.dataTransfer.files;
    if (files?.[0]) handleFileSelect(files[0]);
  }, [canUpload, handleFileSelect]);

  const handleOpenDocument = useCallback((doc) => {
    setCurrentDocument(doc);
    setViewerOpen(true);
    showMessage('Abriendo documento...');
  }, [showMessage]);

  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false);
    setCurrentDocument(null);
  }, []);

  // Effects
  useEffect(() => {
    const initialize = async () => {
      await new Promise(resolve => setTimeout(resolve, TIMEOUTS.INIT_DELAY));
      await Promise.all([loadDocuments(), checkComprobantesDisponibles()]);
      setInitialLoadComplete(true);
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

  // Render helpers
  const renderUploadArea = () => {
    if (isLoading) {
      return (
        <>
          <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-blue-600 mb-6"></div>
          <h3 className="text-xl font-medium text-gray-700 mb-3">Inicializando...</h3>
          <p className="text-base text-gray-500">Verificando acceso y créditos disponibles</p>
        </>
      );
    }

    if (!canUpload) {
      return (
        <>
          <XCircle className="w-20 h-20 mb-6 text-red-400" />
          <h3 className="text-xl font-medium text-red-700 mb-3">
            {!authData.cookiesAvailable ? 'Acceso requerido' : 'Alcanzaste el límite de créditos'}
          </h3>
          <p className="text-base text-red-600 mb-4">
            {!authData.cookiesAvailable
              ? 'Se requiere de autenticación para subir documentos'
              : 'Ya usaste todos tus créditos disponibles para leer comprobantes con IA. Para seguir usando la funcionalidad, tenés que cargar más créditos.'
            }
          </p>
          {authData.cookiesAvailable && (
            <div className="flex gap-3">
              <button
                onClick={() => window.open('#', '_blank')}
                className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Conocer más
              </button>
              <button
                onClick={() => window.open(ADDONS_URL, '_self')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Obtener más créditos
              </button>
            </div>
          )}
        </>
      );
    }

    return (
      <>
        <FileText className={`w-20 h-20 mb-6 transition-colors ${
          dragActive ? 'text-blue-500' : selectedFile ? 'text-green-500' : 'text-gray-400'
        }`} />

        {selectedFile ? (
          <div className="mb-6">
            <h3 className="text-xl font-medium text-green-700 mb-3">Archivo seleccionado</h3>
            <p className="text-base text-gray-600 mb-2">{selectedFile.name}</p>
            <p className="text-sm text-gray-500">({formatFileSize(selectedFile.size)} KB)</p>
          </div>
        ) : (
          <div className="mb-6">
            <h3 className="text-xl font-medium text-gray-700 mb-3">Arrastra tu archivo PDF aquí</h3>
            <p className="text-base text-gray-500">o usa el botón para seleccionar</p>
          </div>
        )}

        <div className="flex gap-4">
          <label className={`px-6 py-3 rounded-lg transition-colors cursor-pointer font-medium ${
            canUpload
              ? 'bg-gray-600 text-white hover:bg-gray-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}>
            Seleccionar archivo
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              }}
              className="hidden"
              disabled={isUploading || !canUpload}
            />
          </label>

          {selectedFile && canUpload && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isUploading ? 'Subiendo...' : 'Subir documento'}
            </button>
          )}
        </div>
      </>
    );
  };

  const renderDocument = (doc) => {
    const { date, time } = formatDate(doc.uploadDate);

    return (
      <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-800 truncate">{doc.filename}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Código: <span className="font-mono">{doc.externalCode}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">{date} - {time}</p>
            {doc.error && (
              <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded border">{doc.error}</p>
            )}
          </div>
          <div className="flex items-center ml-4">
            {getStatusIcon(doc.status)}
            <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(doc.status)}`}>
              {getStatusText(doc.status)}
            </span>
            {doc.deeplink && (
              <button
                onClick={() => handleOpenDocument(doc)}
                className="ml-2 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                title="Ver documento procesado"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {uploadMessage && (
          <div className={`mb-6 p-4 rounded-lg ${getMessageStyles(getMessageType(uploadMessage))}`}>
            <div className="flex items-center">
              {getMessageIcon(getMessageType(uploadMessage))}
              {uploadMessage}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
              <Upload className="w-6 h-6 mr-2 text-blue-600" />
              Subir Documento
            </h2>

            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
                isLoading
                  ? 'border-gray-300 bg-gray-50'
                  : !canUpload
                  ? 'border-red-300 bg-red-50 opacity-60'
                  : dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center">
                {renderUploadArea()}
              </div>
            </div>

            <div className="mt-2 bg-gray-50 rounded-lg p-4">
              <div>
                {!authData.cookiesAvailable && (
                  <div className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-200">
                    <div className="flex items-center">
                      <XCircle className="w-3 h-3 mr-2" />
                      <span className="font-medium">
                        Funcionalidad deshabilitada: Se requieren cookies de autenticación para operar
                      </span>
                    </div>
                  </div>
                )}
                {authData.cookiesAvailable && initialLoadComplete && comprobantesInfo && (
                  <div className={`text-xs mt-2 p-2 rounded border ${
                    comprobantesInfo.canProcessFacturas
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-orange-50 border-orange-200 text-orange-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        Creditos disponibles: {comprobantesInfo.comprobantes_restantes || 0}
                      </span>
                    </div>
                    {comprobantesInfo.comprobantes_comprados && (
                      <div className="text-xs text-gray-500 mt-1">
                        Total del plan: {comprobantesInfo.comprobantes_comprados}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="w-6 h-6 mr-2 text-blue-600" />
                Documentos Recientes
              </span>
              <span className="text-sm font-normal text-gray-500">
                Total: {documents.length}
              </span>
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando documentos...</p>
                </div>
              ) : documents.length > 0 ? (
                documents.map(renderDocument)
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-500 mb-2">No hay documentos</h3>
                  <p className="text-gray-400">Sube tu primer documento para comenzar</p>
                </div>
              )}
            </div>
          </div>
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