import { FileText } from 'lucide-react';
import DocumentItem from './DocumentItem';

const DocumentList = ({ documents, onOpenDocument }) => {
  const renderContent = () => {
    if (documents.length > 0) {
      return documents.map(doc => (
        <DocumentItem
          key={doc.id}
          document={doc}
          onOpenDocument={onOpenDocument}
        />
      ));
    }

    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">No hay documentos</h3>
        <p className="text-gray-400">Sube tu primer documento para comenzar</p>
      </div>
    );
  };

  return (
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
        {renderContent()}
      </div>
    </div>
  );
};

export default DocumentList;