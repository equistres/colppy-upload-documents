# Colppy Document Uploader

Aplicación React para la carga y gestión de documentos integrada con Colppy y Boolfy.

## Tecnologías

- React + Vite
- Tailwind CSS
- Mixpanel (Analytics y Feature Flags)
- Intercom (Soporte)

## Feature Flags con Mixpanel

La aplicación utiliza Mixpanel Feature Flags para controlar el acceso a funcionalidades. Esto permite habilitar o deshabilitar features de forma dinámica sin necesidad de hacer deploy.

### Configuración

#### 1. Inicialización de Mixpanel

En `public/analytics.js`, Mixpanel está inicializado con soporte para feature flags:

```javascript
mixpanel.init('YOUR_PROJECT_TOKEN', {
  debug: true,
  track_pageview: true,
  persistence: 'localStorage',
  flags: true  // Habilita Feature Flags
});
```

#### 2. Hook personalizado: `useFeatureFlag`

El hook `src/hooks/useFeatureFlag.js` proporciona una forma sencilla de verificar feature flags:

```javascript
const [isEnabled, isLoading] = useFeatureFlag(flagName, userId, customProperties);
```

**Parámetros:**
- `flagName` (string): El slug del feature flag en Mixpanel
- `userId` (string): Identificador único del usuario (email)
- `customProperties` (object, opcional): Propiedades adicionales para targeting

**Retorna:**
- `isEnabled` (boolean): Si el feature flag está habilitado para el usuario
- `isLoading` (boolean): Si aún se está evaluando el flag

**Características:**
- Identifica al usuario en Mixpanel automáticamente
- Reintenta hasta 40 veces (10 segundos) si Mixpanel no está listo
- Agrega un delay de 750ms para asegurar que las propiedades se sincronicen
- Limpia recursos al desmontar el componente

#### 3. Wrapper Component

El componente `ColppyDocumentUploaderWrapper` evalúa el feature flag antes de renderizar:

```javascript
const customProperties = useMemo(() => ({
  empresa_id: String(empresaId)
}), [empresaId]);

const [isFeatureEnabled, isLoadingFlag] = useFeatureFlag(
  'colppy-boolfy',
  email,
  customProperties
);

if (isLoadingFlag) {
  return <LoadingScreen />;
}

if (!isFeatureEnabled) {
  return <DemoVersion />;
}

return <FullVersion />;
```

### Propiedades enviadas a Mixpanel

Cuando se identifica un usuario, se envían las siguientes propiedades:

**Propiedades estándar:**
- `$email`: Email del usuario
- `email`: Email del usuario (duplicado para compatibilidad)

**Propiedades personalizadas:**
- `empresa_id`: ID de la empresa del usuario
- `creditos_disponibles`: Créditos disponibles del usuario
- `total_documentos`: Total de documentos del usuario

### Configurar Feature Flags en Mixpanel UI

1. Ve a **Data Management > Feature Flags** en Mixpanel
2. Crea un nuevo feature flag con el slug deseado (ej: `colppy-boolfy`)
3. Configura las reglas de targeting:
   - **Por Email**: Habilita para usuarios específicos
   - **Por empresa_id**: Habilita para empresas específicas
   - **Por porcentaje**: Habilita para un % aleatorio de usuarios
4. Activa el feature flag

### Ejemplo de uso

```javascript
// En cualquier componente
import useFeatureFlag from '../hooks/useFeatureFlag';

function MyComponent({ email, empresaId }) {
  const customProps = useMemo(() => ({
    empresa_id: String(empresaId)
  }), [empresaId]);

  const [showNewFeature, isLoading] = useFeatureFlag(
    'my-new-feature',
    email,
    customProps
  );

  if (isLoading) return <Loading />;

  return (
    <div>
      {showNewFeature ? <NewFeature /> : <OldFeature />}
    </div>
  );
}
```

### Ventajas de esta implementación

- **Sin rebuild**: Cambia features sin hacer deploy
- **Targeting flexible**: Habilita features por email, empresa o porcentaje
- **A/B Testing**: Prueba features con un subconjunto de usuarios
- **Rollback instantáneo**: Desactiva features problemáticas al instante
- **Propiedades personalizadas**: Usa cualquier propiedad para targeting

## Variables de Entorno

```bash
VITE_API_BASE_URL=https://colppy-boolfy-backend-production.up.railway.app
VITE_ADDONS_URL=https://addons.colppy.com
VITE_INTERCOM_APP_ID=j7l53tgt
VITE_API_COLPPY_URL=https://staging.colppy.com/lib/frontera2/service.php
```

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
