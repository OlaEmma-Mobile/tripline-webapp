import path from 'node:path';
import swaggerJSDoc from 'swagger-jsdoc';
import { mergePostmanCollectionIntoSpec } from '@/lib/docs/postman-openapi';

const rootDir = process.cwd();
const apiGlobs = [
  path.join(rootDir, 'app/api/**/*.ts'),
  path.join(rootDir, 'lib/docs/**/*.ts'),
];

type OpenApiDocument = Record<string, unknown>;

const baseDefinition: OpenApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Tripline API',
    version: '1.0.0',
    description:
      'Tripline API documentation. OpenAPI/Swagger is the main source of truth for rider, driver, and admin integration flows.',
  },
  servers: [],
  components: {},
  paths: {},
};

const cache = new Map<string, OpenApiDocument>();

export function getOpenApiDocument(baseUrl: string): OpenApiDocument {
  const cached = cache.get(baseUrl);
  if (cached) return cached;

  const spec = swaggerJSDoc({
    definition: {
      ...baseDefinition,
      servers: [{ url: baseUrl }],
    },
    apis: apiGlobs,
    failOnErrors: false,
  } as any) as OpenApiDocument;

  const merged = mergePostmanCollectionIntoSpec(spec);
  cache.set(baseUrl, merged);
  return merged;
}
