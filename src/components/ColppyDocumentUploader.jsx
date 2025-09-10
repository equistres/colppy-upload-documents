import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileText, Clock, CheckCircle, XCircle, AlertCircle, Eye, X, ExternalLink } from 'lucide-react';

const ColppyDocumentUploader = () => {
  // Variables de entorno
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const ADDONS_URL = import.meta.env.VITE_ADDONS_URL;

  // Refs para cleanup
  const timeoutRefs = useRef([]);
  const intervalRef = useRef(null);

  // Función para obtener cookies con validación
  const getCookie = (name) => {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        const cookieValue = parts.pop().split(';').shift();
        return cookieValue?.trim() || null;
      }
      return null;
    } catch (error) {
      console.warn(`Error reading cookie ${name}:`, error);
      return null;
    }
  };

  // Verificar cookies de autenticación
  const username = getCookie('loginUsernameCookie');
  const password = getCookie('loginPasswordCookie');
  const userId = getCookie('userIdCookie');
  const cookiesAvailable = Boolean(username && password && userId);

  // Configuración solo si las cookies están disponibles
  const formData = cookiesAvailable ? {
    user: username,
    pass: password,
    idEmpresa: userId,
    endPoint: 'https://staging.colppy.com/lib/frontera2/service.php'
  } : null;

  // Estados del componente
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [comprobantesInfo, setComprobantesInfo] = useState(null);
  
  // Estado consolidado del visor
  const [viewerState, setViewerState] = useState({
    loading: false,
    error: false,
    showAlternative: false
  });

  // Variable derivada para determinar si se puede subir
  const canUpload = cookiesAvailable && comprobantesInfo?.canProcessFacturas !== false;

  // Función para limpiar timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current = [];
  }, []);

  // Función para agregar timeout con cleanup automático
  const addTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(() => {
      callback();
      timeoutRefs.current = timeoutRefs.current.filter(id => id !== timeoutId);
    }, delay);
    timeoutRefs.current.push(timeoutId);
    return timeoutId;
  }, []);

  // Función para mostrar mensaje con timeout automático
  const showMessage = useCallback((message, duration = 3000) => {
    setUploadMessage(message);
    addTimeout(() => setUploadMessage(''), duration);
  }, [addTimeout]);

  // Función para verificar comprobantes disponibles
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

  // Función para cargar documentos desde la base de datos
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

  // Función para manejar la apertura del documento en el visor integrado
  const handleOpenDocument = useCallback((doc) => {
    setCurrentDocument(doc);
    setViewerOpen(true);
    setViewerState({ loading: true, error: false, showAlternative: false });
    showMessage('Cargando documento...', 1500);
    
    addTimeout(() => {
      setViewerState(prev => ({ ...prev, loading: false }));
      showMessage('Documento cargado correctamente', 2000);
    }, 1500);
  }, [showMessage, addTimeout]);

  // Función para cerrar el visor
  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false);
    setCurrentDocument(null);
    setViewerState({ loading: false, error: false, showAlternative: false });
  }, []);

  // Función para manejar errores del iframe
  const handleIframeError = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      error: true,
      showAlternative: true
    }));
    showMessage('No se puede mostrar en iframe debido a restricciones de seguridad');
  }, [showMessage]);

  // Función para mostrar visor alternativo
  const handleShowAlternativeViewer = useCallback(() => {
    setViewerState(prev => ({ ...prev, showAlternative: true }));
    showMessage('Mostrando visor alternativo...');
  }, [showMessage]);

  // Función para abrir en nueva pestaña
  const handleOpenInNewTab = useCallback((url) => {
    try {
      window.open(url, '_blank');
      showMessage('Documento abierto en nueva pestaña');
    } catch (error) {
      console.error('Error al abrir nueva pestaña:', error);
      showMessage('Error al abrir el documento en nueva pestaña');
    }
  }, [showMessage]);

  // Función para convertir archivo a Base64
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

  // Función para consultar el estado de un documento
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
  }, [API_BASE_URL]);

  // Función optimizada para actualizar estados de documentos
  const updateProcessingDocuments = useCallback(async () => {
    const processingDocs = documents.filter(doc => 
      doc.status === 'processing' && 
      doc.externalCode && 
      doc.externalCode !== 'Error - No disponible'
    );
    
    if (processingDocs.length === 0) return;

    try {
      // Consultar todos los documentos en paralelo
      const statusPromises = processingDocs.map(doc => 
        checkDocumentStatus(doc.externalCode).then(result => ({ doc, result }))
      );
      
      const results = await Promise.allSettled(statusPromises);
      
      // Procesar resultados
      const updates = results
        .filter(result => result.status === 'fulfilled' && result.value.result)
        .map(result => {
          const { doc, result: statusInfo } = result.value;
          return {
            docId: doc.id,
            updates: {
              ...(statusInfo.process === 'Finished' && { status: 'processed' }),
              statusInfo,
              deeplink: statusInfo.deeplink
            }
          };
        });

      // Aplicar actualizaciones si hay cambios
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

  // Función para subir documento - MODIFICADA para manejar error de comprobantes
  const uploadDocument = useCallback(async (file) => {
    if (!cookiesAvailable) {
      showMessage('Error: No se puede proceder sin cookies de autenticación válidas', 5000);
      return false;
    }

    if (!formData) {
      showMessage('Error: Configuración de autenticación no disponible', 5000);
      return false;
    }

    // Verificar comprobantes antes de proceder
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
        
        // Manejar específicamente el error de sin comprobantes
        if (errorData.includes('Sin comprobantes disponibles') || 
            errorData.includes('sin shots') || 
            errorData.includes('comprobantes restantes: 0')) {
          throw new Error('Sin comprobantes disponibles en tu plan actual. Contacta con soporte para adquirir más comprobantes.');
        }
        
        throw new Error(`Error ${response.status}: ${errorData}`);
      }

      const responseData = await response.json();
      
      // Verificar si la subida fue exitosa
      if (!responseData.success) {
        // Verificar si el error en la respuesta es sobre comprobantes
        if (responseData.message && 
            (responseData.message.includes('Sin comprobantes disponibles') ||
             responseData.message.includes('sin shots') ||
             responseData.message.includes('comprobantes restantes'))) {
          throw new Error('Sin comprobantes disponibles en tu plan actual. Contacta con soporte para adquirir más comprobantes.');
        }
        throw new Error('La API no confirmó una subida exitosa');
      }

      showMessage('Documento subido exitosamente - Procesando...', 3000);
      
      // Recargar la lista de documentos y comprobantes desde la base de datos
      await loadDocuments();
      await checkComprobantesDisponibles();
      
      return true;
    } catch (error) {
      console.error('Error al subir documento:', error);
      
      // Mostrar mensaje específico para error de comprobantes
      if (error.message.includes('Sin comprobantes disponibles')) {
        showMessage(`❌ ${error.message}`, 8000);
      } else {
        showMessage(`Error: ${error.message}`, 5000);
      }
      return false;
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
    }
  }, [cookiesAvailable, formData, convertToBase64, showMessage, loadDocuments, checkComprobantesDisponibles, comprobantesInfo, API_BASE_URL]);

  // Función para seleccionar archivo
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

  // Función para manejar la subida
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

  // Handlers para drag & drop
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

  // Funciones para obtener estado visual
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

  // Función para obtener hostname de forma segura
  const getHostname = useCallback((url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return 'URL inválida';
    }
  }, []);

  // Effect para cargar documentos y comprobantes al inicializar
  useEffect(() => {
    loadDocuments();
    checkComprobantesDisponibles();
  }, [loadDocuments, checkComprobantesDisponibles]);

  // Effect para configurar interval de consulta de estados
  useEffect(() => {
    intervalRef.current = setInterval(updateProcessingDocuments, 15000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateProcessingDocuments]);

  // Effect para cleanup al desmontar
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
        {/* Mensaje de estado */}
        {uploadMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            uploadMessage.includes('Error') || uploadMessage.includes('❌')
              ? 'bg-red-50 border border-red-200 text-red-800'
              : uploadMessage.includes('exitosamente') || uploadMessage.includes('nueva pestaña') || uploadMessage.includes('correctamente')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : uploadMessage.includes('seleccionado')
              ? 'bg-blue-50 border border-blue-200 text-blue-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center">
              {uploadMessage.includes('Error') || uploadMessage.includes('❌')
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
          {/* Zona de carga */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
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

            {/* Estado del sistema y comprobantes */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
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
                    
                    {/* Información de comprobantes disponibles */}
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

          {/* Lista de documentos */}
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

        {/* Modal del visor de documentos */}
        {viewerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleCloseViewer}></div>
            
            <div className="relative h-full flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center">
                    <FileText className="w-6 h-6 mr-3 text-blue-600" />
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800">
                        {currentDocument?.filename}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Código: {currentDocument?.externalCode}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentDocument?.deeplink && (
                      <button
                        onClick={() => handleOpenInNewTab(currentDocument.deeplink)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Abrir en nueva pestaña"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={handleCloseViewer}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Cerrar"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-hidden">
                  {viewerState.loading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Cargando documento...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
                      {currentDocument?.deeplink ? (
                        <div className="h-full flex flex-col">
                          <div className="bg-gray-100 border-b border-gray-200 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-2 ${viewerState.error ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                <span className="text-sm text-gray-700">
                                  {viewerState.error ? 'Iframe bloqueado' : 'Conectado'}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 font-mono bg-gray-200 px-2 py-1 rounded">
                                {getHostname(currentDocument.deeplink)}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              {viewerState.error && (
                                <button
                                  onClick={handleShowAlternativeViewer}
                                  className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
                                >
                                  Visor alternativo
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenInNewTab(currentDocument.deeplink)}
                                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Abrir directamente
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex-1 relative">
                            {viewerState.showAlternative || viewerState.error ? (
                              <div className="h-full flex flex-col">
                                <div className="bg-blue-50 border-b border-blue-200 p-3">
                                  <div className="flex items-center">
                                    <AlertCircle className="w-4 h-4 text-blue-600 mr-2" />
                                    <span className="text-sm text-blue-800">
                                      Visor alternativo - Las restricciones de seguridad impiden mostrar el iframe
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1 p-6 flex items-center justify-center">
                                  <div className="text-center max-w-md">
                                    <FileText className="w-20 h-20 text-blue-500 mx-auto mb-4" />
                                    <h4 className="text-lg font-semibold text-gray-800 mb-3">
                                      Documento disponible
                                    </h4>
                                    <p className="text-gray-600 mb-4">
                                      El documento <strong>{currentDocument.filename}</strong> está listo para visualizar, 
                                      pero requiere abrirse en una nueva ventana debido a las políticas de seguridad del sitio.
                                    </p>
                                    <div className="space-y-3">
                                      <button
                                        onClick={() => handleOpenInNewTab(currentDocument.deeplink)}
                                        className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                      >
                                        <ExternalLink className="w-5 h-5" />
                                        Abrir documento en nueva ventana
                                      </button>
                                      <p className="text-xs text-gray-500">
                                        URL: {currentDocument.deeplink}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <iframe
                                  src={currentDocument.deeplink}
                                  className="w-full h-full border-0"
                                  title={`Visor de ${currentDocument.filename}`}
                                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
                                  onError={handleIframeError}
                                  onLoad={(e) => {
                                    try {
                                      const iframeDoc = e.target.contentDocument;
                                      if (!iframeDoc) {
                                        console.log('Iframe cargado pero sin acceso al contenido');
                                      } else {
                                        const currentUrl = iframeDoc.location.href;
                                        if (currentUrl.includes('signin') || currentUrl.includes('login')) {
                                          handleIframeError();
                                        }
                                      }
                                    } catch (error) {
                                      console.log('Error de acceso al iframe:', error);
                                    }
                                  }}
                                />
                                
                                <div 
                                  className="absolute inset-0 pointer-events-none"
                                  onError={handleIframeError}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h4 className="text-lg font-medium text-gray-700 mb-2">
                              Vista previa del documento
                            </h4>
                            <p className="text-gray-500 mb-4">
                              {currentDocument?.filename}
                            </p>
                            <p className="text-sm text-gray-400">
                              El documento se mostraría aquí cuando esté disponible
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Estado:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(currentDocument?.status)}`}>
                        {getStatusText(currentDocument?.status)}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleCloseViewer}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cerrar
                      </button>
                      {currentDocument?.deeplink && (
                        <button
                          onClick={() => handleOpenInNewTab(currentDocument.deeplink)}
                          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Abrir en nueva pestaña
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColppyDocumentUploader;