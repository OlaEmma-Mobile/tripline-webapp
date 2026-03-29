import SwaggerDocs from '@/components/docs/swagger-ui';

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="border-b bg-slate-50 px-6 py-5">
        <h1 className="text-2xl font-semibold">Tripline API Docs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Swagger/OpenAPI is the main source of truth for Tripline API integration.
        </p>
      </div>

      <SwaggerDocs url="/api/openapi" />
    </main>
  );
}
