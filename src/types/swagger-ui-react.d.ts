declare module 'swagger-ui-react' {
  import type { ComponentType } from 'react';

  interface SwaggerUIProps {
    url?: string;
    spec?: Record<string, unknown>;
    docExpansion?: 'list' | 'full' | 'none';
    defaultModelsExpandDepth?: number;
    persistAuthorization?: boolean;
    tryItOutEnabled?: boolean;
    displayRequestDuration?: boolean;
    filter?: boolean | string;
    deepLinking?: boolean;
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}
