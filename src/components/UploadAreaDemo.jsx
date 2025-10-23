import { Upload, FileText } from 'lucide-react';

// Componente de UploadArea para modo DEMO - Solo visual, sin funcionalidad
const UploadAreaDemo = ({ addonsUrl, showMessage }) => {
  const handleClick = () => {
    showMessage('Modo demo: Esta funcionalidad estará disponible próximamente', 3000);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100" data-tour="upload-area">
      <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
        <Upload className="w-6 h-6 mr-2 text-colppy" />
        Subir Documento
      </h2>

      <div
        className="border-2 border-dashed rounded-lg p-12 text-center border-gray-300 bg-gray-50 opacity-70 cursor-not-allowed"
        onClick={handleClick}
      >
        <div className="flex flex-col items-center pointer-events-none">
          <FileText className="w-20 h-20 mb-6 text-gray-400" />

          <div className="mb-6">
            <h3 className="text-xl font-medium text-gray-700 mb-3">Arrastra tu archivo PDF aquí</h3>
            <p className="text-base text-gray-500">o usa el botón para seleccionar</p>
          </div>

          <div className="flex gap-4">
            <button
              className="px-6 py-3 rounded-lg bg-gray-400 text-white cursor-not-allowed opacity-60 font-medium"
              disabled
            >
              Seleccionar archivo
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 bg-gray-50 rounded-lg p-4">
        <div
          data-tour="credits"
          className="text-xs mt-2 p-2 rounded border bg-purple-50 border-purple-200 text-purple-700"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">
              Creditos disponibles: 150
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Total del plan: 200
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadAreaDemo;
