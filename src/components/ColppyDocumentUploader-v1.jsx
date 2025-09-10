import React, { useState, useEffect } from 'react';
import { Upload, FileText, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';

const ColppyDocumentUploader = () => {
  // Función para generar UUID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Estados del componente
  const [documents, setDocuments] = useState([
    {
      id: 1,
      filename: 'factura-001.pdf',
      status: 'processed',
      uploadDate: new Date('2024-01-15'),
      externalCode: '123456'
    }
  ]);

  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // Valores precargados y ocultos
  const formData = {
    user: 'josefina.zabala@colppy.com',
    pass: 'c9989e8c044a978367faf65b177f0f22',
    idEmpresa: '63235',
    endPoint: 'https://staging.colppy.com/lib/frontera2/service.php'
  };

  // Función para manejar el deeplink - abre en nueva pestaña
  const handleOpenDeeplink = (url) => {
    window.open(url, '_blank');
    setUploadMessage('Documento abierto en nueva pestaña');
    setTimeout(() => setUploadMessage(''), 3000);
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Función para consultar el estado de un documento
  const checkDocumentStatus = async (identifier) => {
    try {
      const response = await fetch('/api/documents/getinfo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: identifier
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Estado del documento:', responseData);
        
        if (responseData.response) {
          try {
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
          } catch (e) {
            console.warn('Error al parsear respuesta de estado:', e);
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error al consultar estado del documento:', error);
      return null;
    }
  };

  // Función para actualizar estados de documentos en procesamiento
  const updateProcessingDocuments = async () => {
    const processingDocs = documents.filter(doc => doc.status === 'processing');
    
    for (const doc of processingDocs) {
      if (doc.externalCode && doc.externalCode.includes('-')) { // Solo si tiene formato UUID
        const statusInfo = await checkDocumentStatus(doc.externalCode);
        
        if (statusInfo && statusInfo.process === 'Finished') {
          setDocuments(prev => 
            prev.map(d => 
              d.id === doc.id 
                ? { 
                    ...d, 
                    status: 'processed',
                    statusInfo: statusInfo,
                    deeplink: statusInfo.deeplink
                  }
                : d
            )
          );
        } else if (statusInfo) {
          // Actualizar información aunque no esté finished
          setDocuments(prev => 
            prev.map(d => 
              d.id === doc.id 
                ? { 
                    ...d, 
                    statusInfo: statusInfo,
                    deeplink: statusInfo.deeplink
                  }
                : d
            )
          );
        }
      }
    }
  };

  const uploadDocument = async (file, externalCode) => {
    try {
      setIsUploading(true);
      setUploadMessage('Convirtiendo archivo a Base64...');
      
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
        externalcode: externalCode,
        filename: file.name,
        bag: JSON.stringify(bagData)
      };

      setUploadMessage('Enviando documento a la API...');

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Respuesta de la API:', responseData);
        
        // Extraer el Identifier de la respuesta
        let apiIdentifier = null;
        if (responseData.response) {
          try {
            const parsedResponse = JSON.parse(responseData.response);
            apiIdentifier = parsedResponse.Identifier;
          } catch (e) {
            console.warn('No se pudo parsear la respuesta:', e);
          }
        }
        
        const newDocument = {
          id: Date.now(),
          filename: file.name,
          status: 'processing', // Siempre inicia en procesando
          uploadDate: new Date(),
          externalCode: apiIdentifier || externalCode, // Usar el ID de la API o el UUID como fallback
          apiResponse: responseData
        };
        
        setDocuments(prev => [newDocument, ...prev]);
        setUploadMessage('Documento subido exitosamente - Procesando...');
        
        return true;
      } else {
        const errorData = await response.text();
        console.error('Error de la API:', errorData);
        throw new Error(`Error ${response.status}: ${errorData}`);
      }
    } catch (error) {
      console.error('Error al subir documento:', error);
      
      const errorDocument = {
        id: Date.now(),
        filename: file.name,
        status: 'error',
        uploadDate: new Date(),
        externalCode: externalCode, // Usar el UUID generado en caso de error
        error: error.message
      };
      
      setDocuments(prev => [errorDocument, ...prev]);
      setUploadMessage(`Error: ${error.message}`);
      return false;
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      setTimeout(() => setUploadMessage(''), 5000);
    }
  };

  const handleFileSelect = (file) => {
    console.log('Archivo seleccionado:', file);
    
    if (file.type !== 'application/pdf') {
      setUploadMessage('Error: Por favor, selecciona solo archivos PDF');
      setTimeout(() => setUploadMessage(''), 3000);
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setUploadMessage('Error: El archivo es demasiado grande (máximo 10MB)');
      setTimeout(() => setUploadMessage(''), 3000);
      return;
    }

    setSelectedFile(file);
    setUploadMessage(`Archivo seleccionado: ${file.name}`);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMessage('Error: No hay archivo seleccionado');
      return;
    }
    
    const externalCode = generateUUID();
    console.log('UUID generado:', externalCode);

    await uploadDocument(selectedFile, externalCode);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

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
      case 'processed':
        return 'Procesado';
      case 'processing':
        return 'Procesando';
      case 'error':
        return 'Error';
      default:
        return 'Desconocido';
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

  // useEffect para consultar estados cada 15 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      updateProcessingDocuments();
    }, 15000); // Consultar cada 15 segundos

    return () => clearInterval(interval);
  }, [documents]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Mensaje de estado */}
        {uploadMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            uploadMessage.includes('Error') 
              ? 'bg-red-50 border border-red-200 text-red-800'
              : uploadMessage.includes('exitosamente')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : uploadMessage.includes('seleccionado')
              ? 'bg-blue-50 border border-blue-200 text-blue-800'
              : uploadMessage.includes('nueva pestaña')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center">
              {uploadMessage.includes('Error') 
                ? <XCircle className="w-5 h-5 mr-2" />
                : uploadMessage.includes('exitosamente') || uploadMessage.includes('nueva pestaña')
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
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center">
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
                  <label className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer font-medium">
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
                      disabled={isUploading}
                    />
                  </label>
                  
                  {selectedFile && (
                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {isUploading ? 'Subiendo...' : 'Subir documento'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-700">
                  <strong>Proceso automático:</strong>
                </p>
                <button
                  onClick={updateProcessingDocuments}
                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                >
                  Verificar estados
                </button>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Solo archivos PDF válidos</li>
                <li>• Tamaño máximo: 10MB por archivo</li>
                <li>• UUID generado automáticamente</li>
                <li>• Conversión automática a Base64</li>
                <li>• Verificación de estado cada 15s</li>
              </ul>
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
              {documents.map((doc) => (
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
                        {doc.uploadDate.toLocaleDateString('es-ES')} - {doc.uploadDate.toLocaleTimeString('es-ES', {
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
                          onClick={() => handleOpenDeeplink(doc.deeplink)}
                          className="ml-2 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="Ver documento procesado"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {documents.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-500 mb-2">No hay documentos</h3>
                  <p className="text-gray-400">Sube tu primer documento para comenzar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColppyDocumentUploader;