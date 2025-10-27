import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, XCircle } from 'lucide-react';

const FILE_CONSTRAINTS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ACCEPTED_TYPE: 'application/pdf'
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

const formatFileSize = (bytes) => Math.round(bytes / 1024);

const UploadArea = ({
  canUpload,
  isUploading,
  authData,
  comprobantesInfo,
  addonsUrl,
  onUpload,
  showMessage
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

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

    // Track file selection event
    if (typeof window.trackEvent !== 'undefined') {
      window.trackEvent('Boolfy - Archivo Seleccionado', {
        'filename': file.name,
        'file_size_kb': formatFileSize(file.size),
        'file_type': file.type,
        'fecha': new Date().toISOString()
      });
    }
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

    const success = await onUpload(selectedFile);
    if (success) {
      // Track successful upload
      if (typeof window.trackEvent !== 'undefined') {
        window.trackEvent('Boolfy - Archivo Subido', {
          'filename': selectedFile.name,
          'file_size_kb': formatFileSize(selectedFile.size),
          'file_type': selectedFile.type,
          'fecha': new Date().toISOString()
        });
      }
      setSelectedFile(null);
    }
  }, [canUpload, authData.cookiesAvailable, selectedFile, onUpload, showMessage]);

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

  // Track when credits info is displayed
  useEffect(() => {
    if (authData.cookiesAvailable && comprobantesInfo) {
      if (typeof window.trackEvent !== 'undefined') {
        window.trackEvent('Boolfy - Visualización de Créditos', {
          'creditos_disponibles': comprobantesInfo.comprobantes_restantes || 0,
          'creditos_totales': comprobantesInfo.comprobantes_comprados || 0,
          'puede_procesar': comprobantesInfo.canProcessFacturas,
          'fecha': new Date().toISOString()
        });
      }
    }
  }, [authData.cookiesAvailable, comprobantesInfo]);

  const renderUploadContent = () => {
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
                onClick={() => window.open(addonsUrl, '_self')}
                className="px-6 py-3 bg-colppy text-white rounded-lg hover:bg-colppy-hover transition-colors font-medium"
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
          dragActive ? 'text-colppy' : selectedFile ? 'text-green-500' : 'text-gray-400'
        }`} />

        {selectedFile ? (
          <div className="mb-6">
            <h3 className="text-xl font-medium text-green-700 mb-3">Archivo seleccionado</h3>
            <p className="text-base text-gray-600 mb-2">{selectedFile.name}</p>
            <p className="text-sm text-gray-500">({formatFileSize(selectedFile.size)} KB)</p>
          </div>
        ) : (
          <div className="mb-6">
            <p className="text-base text-gray-600">Arrastrá el archivo o hacé click en el botón para seleccionarlo desde tu computadora.</p>
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
              className="px-6 py-3 bg-colppy text-white rounded-lg hover:bg-colppy-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isUploading ? 'Subiendo...' : 'Subir documento'}
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100" data-tour="upload-area">
      <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
        <Upload className="w-6 h-6 mr-2 text-colppy" />
        Subir Documento
      </h2>

      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
          !canUpload
            ? 'border-red-300 bg-red-50 opacity-60'
            : dragActive
            ? 'border-colppy bg-purple-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center">
          {renderUploadContent()}
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
          {authData.cookiesAvailable && comprobantesInfo && (
            <div
              data-tour="credits"
              className={`text-xs mt-2 p-2 rounded border ${
                comprobantesInfo.canProcessFacturas
                  ? 'bg-purple-50 border-purple-200 text-purple-700'
                  : 'bg-orange-50 border-orange-200 text-orange-700'
              }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  Créditos disponibles: {comprobantesInfo.comprobantes_restantes || 0}
                </span>
              </div>
              {comprobantesInfo.comprobantes_comprados && (
                <div className="text-xs text-gray-500 mt-1">
                  Total adquiridos: {comprobantesInfo.comprobantes_comprados}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadArea;