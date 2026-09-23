'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

const openApiUrl = '/api/v1/openapi.json';

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-white">
      <ApiReferenceReact
        configuration={{
          url: openApiUrl,
          theme: 'purple',
          layout: 'modern',
          withDefaultFonts: false,
          showSidebar: true,
          isEditable: false,
        }}
      />
    </main>
  );
}
