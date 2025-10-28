import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, XCircle, CheckCircle, Shield } from 'lucide-react';

const FILE_CONSTRAINTS = {
  MAX_SIZE: 10 * 1024 * 1024,
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
        <div className="space-y-5">
          <div className="flex justify-center">
            <div className="p-4 bg-red-50 rounded-full">
              <XCircle className="w-12 h-12 text-red-600" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {!authData.cookiesAvailable ? 'Autenticación Requerida' : 'Alcanzaste el límite de créditos'}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
              {!authData.cookiesAvailable
                ? 'Para utilizar esta funcionalidad, necesita autenticarse en el sistema.'
                : 'Ya usaste todos tus créditos disponibles para leer comprobantes con IA. Para seguir usando la funcionalidad, tenés que cargar más créditos.'
              }
            </p>
          </div>
          {authData.cookiesAvailable && (
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => window.open('#', '_blank')}
                className="px-5 py-2.5 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
              >
                Más Información
              </button>
              <button
                onClick={() => window.open(addonsUrl, '_self')}
                className="px-5 py-2.5 bg-colppy text-white text-sm font-medium rounded-lg hover:bg-colppy-hover transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-colppy"
              >
                Obtener más créditos
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="flex justify-center">
          <div className={`p-5 rounded-full transition-all duration-200 ${
            dragActive ? 'bg-purple-50 scale-110' :
            selectedFile ? 'bg-green-50' : 'bg-gray-50'
          }`}>
            <FileText className={`w-14 h-14 transition-colors ${
              dragActive ? 'text-colppy' :
              selectedFile ? 'text-green-600' : 'text-gray-400'
            }`} strokeWidth={1.5} />
          </div>
        </div>

        {selectedFile ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle className="w-4 h-4" strokeWidth={2} />
                <span className="text-sm font-medium">Archivo Seleccionado</span>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-1 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)} KB · Documento PDF</p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Seleccionar Documento</h3>
            <p className="text-sm text-gray-600">Arrastra un archivo PDF o haz clic para seleccionar</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <label className={`flex-1 text-center px-5 py-3 text-sm font-medium rounded-lg border transition-all cursor-pointer focus-within:ring-2 focus-within:ring-offset-2 ${
            canUpload
              ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus-within:ring-gray-400'
              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          }`}>
            Seleccionar Archivo
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
              className="flex-1 px-5 py-3 bg-colppy text-white text-sm font-medium rounded-lg hover:bg-colppy-hover transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-colppy"
            >
              {isUploading ? 'Procesando...' : 'Subir Documento'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-tour="upload-area">
      {/* Header profesional */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-colppy to-purple-700 rounded-lg shadow-sm">
            <Upload className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Subir Documento</h2>
            <p className="text-xs text-gray-500">Carga tus archivos PDF de forma segura</p>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div className="p-6">
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
            !canUpload
              ? 'border-red-200 bg-red-50/30'
              : dragActive
              ? 'border-colppy bg-purple-50/50'
              : 'border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-100/50'
          } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {renderUploadContent()}
        </div>
      </div>

      {/* Credits Info profesional */}
      <div className="px-6 pb-6">
        {!authData.cookiesAvailable && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <Shield className="w-5 h-5 text-red-600" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-900 mb-1">Funcionalidad Deshabilitada</h4>
                <p className="text-xs text-red-700 leading-relaxed">Se requieren credenciales de autenticación válidas para operar esta funcionalidad.</p>
              </div>
            </div>
          </div>
        )}

        {authData.cookiesAvailable && comprobantesInfo && (
          <div
            data-tour="credits"
            className={`border rounded-lg p-4 ${
              comprobantesInfo.canProcessFacturas
                ? 'bg-green-50 border-green-200'
                : 'bg-orange-50 border-orange-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                  comprobantesInfo.canProcessFacturas
                    ? 'bg-green-100'
                    : 'bg-orange-100'
                }`}>
                  <CheckCircle className={`w-5 h-5 ${
                    comprobantesInfo.canProcessFacturas ? 'text-green-600' : 'text-orange-600'
                  }`} strokeWidth={2} />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">
                      {comprobantesInfo.comprobantes_restantes || 0}
                    </span>
                    <span className="text-xs font-medium text-gray-600">créditos disponibles</span>
                  </div>
                  {comprobantesInfo.comprobantes_comprados && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Total adquiridos: {comprobantesInfo.comprobantes_comprados}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadArea;
