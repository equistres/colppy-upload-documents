# Configuración del Product Tour de Intercom

## Configuración Inicial

### 1. Agregar tu APP_ID de Intercom

Reemplaza `"YOUR_APP_ID"` en los siguientes archivos con tu APP_ID real de Intercom:

#### En `index.html` (líneas 15 y 18):
```javascript
window.intercomSettings = {
  api_base: "https://api-iam.intercom.io",
  app_id: "TU_APP_ID_AQUI"  // <-- Reemplazar aquí
};

// En el src del script:
s.src='https://widget.intercom.io/widget/TU_APP_ID_AQUI';  // <-- Y aquí
```

#### Crear archivo `.env` (si no existe):
```
VITE_INTERCOM_APP_ID=TU_APP_ID_AQUI
```

### 2. Reiniciar el servidor de desarrollo
Después de agregar el APP_ID, reinicia el servidor:
```bash
npm run dev
```

---

## Selectores Disponibles para el Tour

Los siguientes selectores `data-tour` están disponibles en la aplicación para crear el Product Tour en Intercom:

### 1. `[data-tour="upload-area"]`
**Ubicación**: Componente UploadArea
**Elemento**: Contenedor principal del área de carga
**Descripción sugerida**:
> "Bienvenido al Asistente Colppy IA para facturación. Aquí podés subir tus documentos PDF para procesarlos automáticamente."

### 2. `[data-tour="credits"]`
**Ubicación**: UploadArea (dentro del área de información)
**Elemento**: Badge que muestra créditos disponibles
**Descripción sugerida**:
> "Estos son tus créditos disponibles. Cada documento procesado consume un crédito."

### 3. `[data-tour="document-list"]`
**Ubicación**: Componente DocumentList
**Elemento**: Contenedor de la lista de documentos
**Descripción sugerida**:
> "Acá vas a ver todos tus documentos procesados. Podés ver su estado y la información extraída."

### 4. `[data-tour="document-item"]`
**Ubicación**: Primer DocumentItem en la lista
**Elemento**: Tarjeta individual de documento
**Descripción sugerida**:
> "Hacé clic en el ícono del ojo para ver los detalles completos del documento procesado."

---

## Flujo Sugerido del Tour

### Paso 1: Bienvenida
- **Target**: `[data-tour="upload-area"]`
- **Título**: "Bienvenido al Asistente Colppy IA"
- **Mensaje**: "Esta herramienta te permite procesar facturas y comprobantes automáticamente usando inteligencia artificial. Te mostramos cómo funciona."

### Paso 2: Subida de Documentos
- **Target**: `[data-tour="upload-area"]`
- **Título**: "Subí tus documentos"
- **Mensaje**: "Seleccioná un archivo PDF desde tu computadora. Aceptamos documentos de hasta 10MB."

### Paso 3: Créditos
- **Target**: `[data-tour="credits"]`
- **Título**: "Tus créditos disponibles"
- **Mensaje**: "Cada documento procesado consume un crédito. Podés comprar más cuando lo necesites."

### Paso 4: Lista de Documentos
- **Target**: `[data-tour="document-list"]`
- **Título**: "Documentos procesados"
- **Mensaje**: "Aquí encontrás todos tus documentos con su estado: procesando, procesado o con error."

### Paso 5: Ver Detalles
- **Target**: `[data-tour="document-item"]` (requiere que exista al menos un documento)
- **Título**: "Ver detalles"
- **Mensaje**: "Hacé clic en el ícono del ojo para ver toda la información extraída del documento."

---

## Configurar el Tour en Intercom

1. Inicia sesión en tu dashboard de Intercom
2. Ve a **Messages** → **Product Tours**
3. Crea un nuevo Product Tour
4. Usa los selectores CSS listados arriba (`[data-tour="..."]`)
5. Configura el tour para mostrarse solo una vez por usuario
6. Agrega la opción de "Skip tour" en cada paso

---

## Tracking de Eventos

La aplicación ya trackea los siguientes eventos automáticamente:

### Eventos trackeados:
- `Boolfy - Archivo Seleccionado`: Cuando el usuario selecciona un archivo
- `Boolfy - Archivo Subido`: Cuando se sube exitosamente un documento
- `Boolfy - Visualización de Créditos`: Cuando se muestra información de créditos

Estos eventos se pueden usar en Intercom para:
- Crear segmentos de usuarios
- Activar mensajes automáticos
- Generar reportes de uso

---

## Métodos Disponibles

El hook `useIntercom` retorna los siguientes métodos que podés usar en el código:

```javascript
const intercom = useIntercom(appId, userData);

// Métodos disponibles:
intercom.show();                          // Mostrar el messenger
intercom.hide();                          // Ocultar el messenger
intercom.showNewMessage("Mensaje");       // Mostrar un mensaje específico
intercom.startTour(tourId);               // Iniciar un tour específico por ID
intercom.trackEvent(name, metadata);      // Trackear un evento custom
intercom.update(data);                    // Actualizar datos del usuario
```

---

## Datos del Usuario Enviados a Intercom

La aplicación envía automáticamente los siguientes datos a Intercom:

```javascript
{
  user_id: empresaId,
  email: email,
  name: email || `Usuario ${empresaId}`,
  created_at: Math.floor(Date.now() / 1000),
  empresa_id: empresaId,
  creditos_disponibles: comprobantesInfo?.comprobantes_restantes || 0,
  total_documentos: documents.length
}
```

Estos datos te permiten:
- Segmentar usuarios por créditos disponibles
- Identificar usuarios activos (con documentos)
- Personalizar mensajes según el uso

---

## Notas Importantes

- El tour solo se mostrará cuando todos los componentes estén renderizados
- Si no hay documentos, el selector `[data-tour="document-item"]` no existirá
- Considerá configurar el tour para que se active después de que el usuario haya subido al menos un documento
- El widget de Intercom aparecerá en la esquina inferior derecha automáticamente
