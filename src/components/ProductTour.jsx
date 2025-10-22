import { useState, useEffect } from 'react';
import Joyride, { STATUS, ACTIONS, EVENTS, LIFECYCLE } from 'react-joyride';

const ProductTour = ({ run, onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">Bienvenido al Asistente Colppy IA</h2>
          <p>Te vamos a mostrar cómo funciona esta herramienta en unos pocos pasos.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="credits"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">Créditos Disponibles</h3>
          <p>Aquí podés ver cuántos créditos tenés disponibles para procesar facturas. Cada factura consume 1 crédito.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="upload-area"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">Zona de Carga</h3>
          <p>Seleccioná tus facturas en PDF haciendo clic en "Seleccionar archivo". Las facturas se procesarán automáticamente.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="document-list"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">Lista de Documentos</h3>
          <p>Aquí vas a ver todas tus facturas cargadas con su estado:</p>
          <ul className="list-disc ml-5 mt-2">
            <li><strong>Procesando:</strong> La factura se está analizando</li>
            <li><strong>Procesado:</strong> Factura procesada correctamente</li>
            <li><strong>Error:</strong> Hubo un problema con la factura</li>
          </ul>
        </div>
      ),
      placement: 'left',
    },
    {
      target: '[data-tour="document-item"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">Acciones de Documento</h3>
          <p>Hacé clic en el ícono del ojo para ver el contenido extraído de la factura.</p>
        </div>
      ),
      placement: 'left',
    },
  ];

  const handleJoyrideCallback = (data) => {
    const { status, action, index, lifecycle } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      onComplete();
    }

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(data.type)) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  };

  return (
    <>
      <style>{`
        [data-action="primary"] {
          background-color: #6633cc !important;
          border-radius: 8px !important;
          padding: 8px 16px !important;
          font-size: 0 !important;
        }
        [data-action="primary"]::after {
          content: '${stepIndex === steps.length - 1 ? 'Finalizar' : 'Siguiente'}';
          font-size: 14px !important;
        }
        [data-action="back"] {
          color: #6633cc !important;
          margin-right: 10px !important;
          font-size: 0 !important;
        }
        [data-action="back"]::after {
          content: 'Anterior';
          font-size: 14px !important;
        }
        [data-action="skip"] {
          color: #6b7280 !important;
          font-size: 0 !important;
        }
        [data-action="skip"]::after {
          content: 'Saltar tour';
          font-size: 14px !important;
        }
      `}</style>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        disableScrolling={false}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#6633cc',
            zIndex: 10000,
          },
        }}
        locale={{
          back: 'Anterior',
          close: 'Cerrar',
          last: 'Finalizar',
          next: 'Siguiente',
          skip: 'Saltar tour',
        }}
      />
    </>
  );
};

export default ProductTour;
