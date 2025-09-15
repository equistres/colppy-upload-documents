import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileText, Clock, CheckCircle, XCircle, AlertCircle, Eye, X, ExternalLink } from 'lucide-react';
import DocumentViewer from './DocumentViewer';

const ColppyDocumentUploader = ({ empresaId, email, getCookie }) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const ADDONS_URL = import.meta.env.VITE_ADDONS_URL;

  const timeoutRefs = useRef([]);
  const intervalRef = useRef(null);

  const username  = email ?? "";
  const password  = getCookie('loginPasswordCookie') ?? "";

  const cookiesAvailable = Boolean(username && password && empresaId);

  const formData = cookiesAvailable ? {
    user: username,
    pass: password,
    idEmpresa: empresaId,
    endPoint: 'https://staging.colppy.com/lib/frontera2/service.php'
  } : null;

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [comprobantesInfo, setComprobantesInfo] = useState(null);

  const canUpload = cookiesAvailable && comprobantesInfo?.canProcessFacturas !== false;

  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current = [];
  }, []);

  const addTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(() => {
      callback();
      timeoutRefs.current = timeoutRefs.current.filter(id => id !== timeoutId);
    }, delay);
    timeoutRefs.current.push(timeoutId);
    return timeoutId;
  }, []);

  const showMessage = useCallback((message, duration = 3000) => {
    setUploadMessage(message);
    addTimeout(() => setUploadMessage(''), duration);
  }, [addTimeout]);

  const checkComprobantesDisponibles = useCallback(async () => {
    if (!cookiesAvailable || !formData?.idEmpresa) {
      setComprobantesInfo(null);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/facturas/comprobantes/${formData.idEmpresa}`);
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
  }, [cookiesAvailable, formData?.idEmpresa, API_BASE_URL]);

  const loadDocuments = useCallback(async () => {
    if (!cookiesAvailable || !formData?.idEmpresa) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/facturas/empresa/${formData.idEmpresa}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.facturas) {
        setDocuments(data.facturas);
      }
    } catch (error) {
      console.error('Error cargando documentos:', error);
      showMessage('Error al cargar documentos existentes', 3000);
    } finally {
      setLoading(false);
    }
  }, [cookiesAvailable, formData?.idEmpresa, showMessage, API_BASE_URL]);

  const handleOpenDocument = useCallback((doc) => {
    setCurrentDocument(doc);
    setViewerOpen(true);
    showMessage('Abriendo documento...');
  }, [showMessage]);

  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false);
    setCurrentDocument(null);
  }, []);

  const convertToBase64 = useCallback((file) => {
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
  }, []);

  // FUNCIÓN ACTUALIZADA: Ahora usa State en lugar de Process
  const checkDocumentStatus = useCallback(async (identifier) => {
    if (!identifier || identifier === 'Error - No disponible') {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/getinfo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const responseData = await response.json();
      
      if (responseData.response) {
        const parsedResponse = JSON.parse(responseData.response);
        if (parsedResponse && parsedResponse.length > 0) {
          const docInfo = parsedResponse[0];
          return {
            identifier: docInfo.Identifier,
            state: docInfo.State,          // ← Usar State como campo principal
            process: docInfo.Process,      // ← Mantener Process por compatibilidad
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
  }, [API_BASE_URL]);

  // FUNCIÓN ACTUALIZADA: Ahora evalúa State en lugar de Process
  const updateProcessingDocuments = useCallback(async () => {
    const processingDocs = documents.filter(doc => 
      doc.status === 'processing' && 
      doc.externalCode && 
      doc.externalCode !== 'Error - No disponible'
    );
    
    if (processingDocs.length === 0) return;

    try {
      const statusPromises = processingDocs.map(doc => 
        checkDocumentStatus(doc.externalCode).then(result => ({ doc, result }))
      );
      
      const results = await Promise.allSettled(statusPromises);
      
      const updates = results
        .filter(result => result.status === 'fulfilled' && result.value.result)
        .map(result => {
          const { doc, result: statusInfo } = result.value;
          
          // CAMBIO PRINCIPAL: Evaluar State en lugar de Process
          let newStatus = doc.status;
          const state = statusInfo.state?.toLowerCase();
          
          switch (state) {
            case 'completed':
              newStatus = 'processed';
              break;
            case 'rejected':
              newStatus = 'error';
              break;
            case 'processing':
            case 'uploaded':
              newStatus = 'processing';
              break;
            case 'pending':
              newStatus = 'pending';
              break;
            default:
              // Fallback a Process si State no es reconocido
              if (statusInfo.process?.toLowerCase() === 'finished') {
                newStatus = 'processed';
              }
              break;
          }
          
          return {
            docId: doc.id,
            updates: {
              ...(newStatus !== doc.status && { status: newStatus }),
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
  }, [documents, checkDocumentStatus]);

  const uploadDocument = useCallback(async (file) => {
    if (!cookiesAvailable) {
      showMessage('Error: No se puede proceder sin cookies de autenticación válidas', 5000);
      return false;
    }

    if (!formData) {
      showMessage('Error: Configuración de autenticación no disponible', 5000);
      return false;
    }

    if (comprobantesInfo && !comprobantesInfo.canProcessFacturas) {
      showMessage('Sin comprobantes disponibles en tu plan actual. Contacta con soporte para adquirir más comprobantes.', 8000);
      return false;
    }

    try {
      setIsUploading(true);
      showMessage('Convirtiendo archivo a Base64...');
      
      const base64Document = await convertToBase64(file);
      
      const bagData = {
        user: formData.user,
        pass: formData.pass,
        idEmpresa: formData.idEmpresa,
        endPoint: formData.endPoint
      };

      const requestBody = {
        agent: "Facturas AR",
        document: base64Document,
        filename: file.name,
        bag: JSON.stringify(bagData)
      };

      showMessage('Enviando documento a la API...');

      const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        
        if (errorData.includes('Sin comprobantes disponibles') || 
            errorData.includes('sin shots') || 
            errorData.includes('comprobantes restantes: 0')) {
          throw new Error('Sin comprobantes disponibles en tu plan actual. Contacta con soporte para adquirir más comprobantes.');
        }
        
        throw new Error(`Error ${response.status}: ${errorData}`);
      }

      const responseData = await response.json();
      
      if (!responseData.success) {
        if (responseData.message && 
            (responseData.message.includes('Sin comprobantes disponibles') ||
             responseData.message.includes('sin shots') ||
             responseData.message.includes('comprobantes restantes'))) {
          throw new Error('Sin comprobantes disponibles en tu plan actual. Contacta con soporte para adquirir más comprobantes.');
        }
        throw new Error('La API no confirmó una subida exitosa');
      }

      showMessage('Documento subido exitosamente - Procesando...', 3000);
      
      await loadDocuments();
      await checkComprobantesDisponibles();
      
      return true;
    } catch (error) {
      console.error('Error al subir documento:', error);
      
      if (error.message.includes('Sin comprobantes disponibles')) {
        showMessage(`Error: ${error.message}`, 8000);
      } else {
        showMessage(`Error: ${error.message}`, 5000);
      }
      return false;
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
    }
  }, [cookiesAvailable, formData, convertToBase64, showMessage, loadDocuments, checkComprobantesDisponibles, comprobantesInfo, API_BASE_URL]);

  const handleFileSelect = useCallback((file) => {
    if (!canUpload) {
      if (!cookiesAvailable) {
        showMessage('Error: No se pueden procesar archivos sin las cookies de autenticación', 5000);
      } else if (comprobantesInfo && !comprobantesInfo.canProcessFacturas) {
        showMessage('Error: Sin comprobantes disponibles en tu plan actual', 5000);
      }
      return;
    }

    if (file.type !== 'application/pdf') {
      showMessage('Error: Por favor, selecciona solo archivos PDF');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      showMessage('Error: El archivo es demasiado grande (máximo 10MB)');
      return;
    }

    setSelectedFile(file);
    showMessage(`Archivo seleccionado: ${file.name}`);
  }, [canUpload, cookiesAvailable, comprobantesInfo, showMessage]);

  const handleUpload = useCallback(async () => {
    if (!canUpload) {
      if (!cookiesAvailable) {
        showMessage('Error: No se puede subir sin las cookies de autenticación');
      } else {
        showMessage('Error: Sin comprobantes disponibles para procesar documentos');
      }
      return;
    }

    if (!selectedFile) {
      showMessage('Error: No hay archivo seleccionado');
      return;
    }
    
    await uploadDocument(selectedFile);
  }, [canUpload, cookiesAvailable, selectedFile, uploadDocument, showMessage]);

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
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [canUpload, handleFileSelect]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'processed': return 'Procesado';
      case 'processing': return 'Procesando';
      case 'error': return 'Error';
      default: return 'Desconocido';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  useEffect(() => {
    loadDocuments();
    checkComprobantesDisponibles();
  }, [loadDocuments, checkComprobantesDisponibles]);

  useEffect(() => {
    intervalRef.current = setInterval(updateProcessingDocuments, 45000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateProcessingDocuments]);

  useEffect(() => {
    return () => {
      clearAllTimeouts();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [clearAllTimeouts]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {uploadMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            uploadMessage.includes('Error') || uploadMessage.includes('Error:')
              ? 'bg-red-50 border border-red-200 text-red-800'
              : uploadMessage.includes('exitosamente') || uploadMessage.includes('nueva pestaña') || uploadMessage.includes('correctamente')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : uploadMessage.includes('seleccionado')
              ? 'bg-blue-50 border border-blue-200 text-blue-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center">
              {uploadMessage.includes('Error') || uploadMessage.includes('Error:')
                ? <XCircle className="w-5 h-5 mr-2" />
                : uploadMessage.includes('exitosamente') || uploadMessage.includes('nueva pestaña') || uploadMessage.includes('correctamente')
                ? <CheckCircle className="w-5 h-5 mr-2" />
                : <Clock className="w-5 h-5 mr-2" />
              }
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
                !canUpload
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
                {!canUpload ? (
                  <>
                    <XCircle className="w-20 h-20 mb-6 text-red-400" />
                    <h3 className="text-xl font-medium text-red-700 mb-3">
                      {!cookiesAvailable ? 'Acceso requerido' : 'Sin comprobantes disponibles'}
                    </h3>
                    <p className="text-base text-red-600 mb-4">
                      {!cookiesAvailable 
                        ? 'Se requiere de autenticación para subir documentos'
                        : 'No tienes comprobantes disponibles en tu plan actual'
                      }
                    </p>
                    {!cookiesAvailable ? null : (
                      <button
                        onClick={() => window.open(ADDONS_URL, '_blank')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Comprar más comprobantes
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <FileText className={`w-20 h-20 mb-6 transition-colors ${
                      dragActive ? 'text-blue-500' : selectedFile ? 'text-green-500' : 'text-gray-400'
                    }`} />
                    
                    {selectedFile ? (
                      <div className="mb-6">
                        <h3 className="text-xl font-medium text-green-700 mb-3">
                          Archivo seleccionado
                        </h3>
                        <p className="text-base text-gray-600 mb-2">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          ({Math.round(selectedFile.size / 1024)} KB)
                        </p>
                      </div>
                    ) : (
                      <div className="mb-6">
                        <h3 className="text-xl font-medium text-gray-700 mb-3">
                          Arrastra tu archivo PDF aquí
                        </h3>
                        <p className="text-base text-gray-500">
                          o usa el botón para seleccionar
                        </p>
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
                            if (e.target.files[0]) {
                              handleFileSelect(e.target.files[0]);
                            }
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
                )}
              </div>
            </div>

            <div className="mt-2 bg-gray-50 rounded-lg p-4">
              <div>
                <p className="text-xs text-gray-600 mb-2">
                  <strong>Estado del sistema:</strong>
                </p>
                {!cookiesAvailable && (
                  <div className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-200">
                    <div className="flex items-center">
                      <XCircle className="w-3 h-3 mr-2" />
                      <span className="font-medium">
                        Funcionalidad deshabilitada: Se requieren cookies de autenticación para operar
                      </span>
                    </div>
                  </div>
                )}
                {cookiesAvailable && (
                  <>
                    <div className="text-xs text-green-600 mt-2 bg-green-50 p-2 rounded border border-green-200">
                      <div className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-2" />
                        <span className="font-medium">
                          Sistema listo para subir documentos
                        </span>
                      </div>
                    </div>
                    
                    {comprobantesInfo && (
                      <div className={`text-xs mt-2 p-2 rounded border ${
                        comprobantesInfo.canProcessFacturas 
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-orange-50 border-orange-200 text-orange-700'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            Comprobantes disponibles: {comprobantesInfo.comprobantes_restantes || 0}
                          </span>
                          {!comprobantesInfo.canProcessFacturas && (
                            <span className="text-xs bg-orange-200 px-2 py-1 rounded">
                              Sin comprobantes
                            </span>
                          )}
                        </div>
                        {comprobantesInfo.comprobantes_comprados && (
                          <div className="text-xs text-gray-500 mt-1">
                            Total del plan: {comprobantesInfo.comprobantes_comprados}
                          </div>
                        )}
                      </div>
                    )}
                  </>
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
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-800 truncate">{doc.filename}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Código: <span className="font-mono">{doc.externalCode}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(doc.uploadDate).toLocaleDateString('es-ES')} - {new Date(doc.uploadDate).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {doc.error && (
                          <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded border">
                            {doc.error}
                          </p>
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
                ))
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