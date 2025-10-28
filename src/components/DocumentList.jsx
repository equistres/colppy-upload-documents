import { FileText } from 'lucide-react';
import DocumentItem from './DocumentItem';

const DocumentList = ({ documents, onOpenDocument }) => {
  const renderContent = () => {
    if (documents.length > 0) {
      return documents.map((doc, index) => (
        <DocumentItem
          key={doc.id}
          document={doc}
          onOpenDocument={onOpenDocument}
          data-tour={index === 0 ? "document-item" : undefined}
        />
      ));
    }

    return (
      <div className="text-center py-16">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gray-50 rounded-full">
            <FileText className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
          </div>
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">Sin Documentos</h3>
        <p className="text-sm text-gray-500">Los documentos cargados aparecerán aquí</p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-tour="document-list">
      {/* Header profesional */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-colppy to-purple-700 rounded-lg shadow-sm">
              <FileText className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Documentos Procesados</h2>
              <p className="text-xs text-gray-500">Historial de cargas recientes</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full border border-gray-200">
            {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
          </span>
        </div>
      </div>

      {/* Lista de documentos */}
      <div className="p-6">
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default DocumentList;
