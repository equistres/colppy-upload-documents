import { Upload, FileText, Lock } from 'lucide-react';

// Componente de UploadArea para modo DEMO - Solo visual, sin funcionalidad
const UploadAreaDemo = ({ addonsUrl, showMessage }) => {
  const handleClick = () => {
    showMessage('Modo demo: Esta funcionalidad estará disponible próximamente', 3000);
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
            <h2 className="text-base font-semibold text-gray-900">Cargar Documento</h2>
            <p className="text-xs text-gray-500">Sube archivos PDF para procesar con IA</p>
          </div>
        </div>
      </div>

      {/* Área de contenido */}
      <div className="p-6">
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50 cursor-not-allowed relative"
          onClick={handleClick}
        >
          {/* Overlay de bloqueo */}
          <div className="absolute inset-0 bg-gray-100 bg-opacity-60 rounded-lg flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
              <Lock className="w-4 h-4 text-gray-600" strokeWidth={2} />
              <span className="text-sm font-medium text-gray-700">Modo Demo</span>
            </div>
          </div>

          <div className="flex flex-col items-center opacity-50 pointer-events-none">
            <div className="p-5 bg-gray-100 rounded-full mb-4">
              <FileText className="w-14 h-14 text-gray-400" strokeWidth={1.5} />
            </div>

            <div className="mb-6">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Seleccionar Documento</h3>
              <p className="text-sm text-gray-600">Arrastra un archivo PDF o haz clic para seleccionar</p>
            </div>

            <button
              className="px-6 py-3 rounded-lg bg-gray-400 text-white font-medium"
              disabled
            >
              Seleccionar Archivo
            </button>
          </div>
        </div>

        {/* Información de créditos demo */}
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4" data-tour="credits">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-purple-900">
                  Créditos Disponibles
                </span>
                <span className="text-lg font-bold text-colppy">150</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-700">Total adquiridos</span>
                <span className="text-xs font-medium text-purple-700">200</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadAreaDemo;
