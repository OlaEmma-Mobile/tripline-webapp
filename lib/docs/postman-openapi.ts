import fs from 'node:fs';
import path from 'node:path';

type OpenApiDocument = Record<string, any>;

type PostmanItem = {
  name?: string;
  description?: string;
  item?: PostmanItem[];
  request?: {
    method?: string;
    description?: string;
    url?: string | { raw?: string };
    body?: { mode?: string; raw?: string };
  };
  response?: PostmanResponse[];
};

type PostmanCollection = {
  item?: PostmanItem[];
};

type PostmanResponse = {
  name?: string;
  status?: string;
  code?: number;
  body?: string;
  _postman_previewlanguage?: string;
  header?: Array<{ key?: string; value?: string }>;
};

function readCollection(): PostmanCollection | null {
  const filePath = path.join(process.cwd(), 'postman', 'Tripline-Auth.postman_collection.json');
  if (!fs.existsSync(filePath)) return null;

  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as PostmanCollection;
}

function normalizePath(rawUrl: string): { path: string; queryParams: Array<{ name: string; example?: string }>; pathParams: string[] } | null {
  const withoutBase = rawUrl.replace(/^\{\{baseUrl\}\}/, '');
  if (!withoutBase.startsWith('/api/')) return null;

  const [pathname, query = ''] = withoutBase.split('?');
  const pathParams: string[] = [];
  const normalizedPath = pathname.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    pathParams.push(key);
    return `{${key}}`;
  });

  const queryParams = query
    .split('&')
    .filter(Boolean)
    .map((entry) => {
      const [name, value] = entry.split('=');
      return { name, example: value };
    });

  return { path: normalizedPath, queryParams, pathParams };
}

function inferRequestBody(request: PostmanItem['request']): Record<string, any> | undefined {
  const body = request?.body;
  if (!body || body.mode !== 'raw' || !body.raw) return undefined;

  let example: unknown = body.raw;
  try {
    example = JSON.parse(body.raw);
  } catch {
    example = body.raw;
  }

  return {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
        },
        example,
      },
    },
  };
}

function inferResponseContentType(response: PostmanResponse): string | undefined {
  const explicitType = response.header?.find((header) => header.key?.toLowerCase() === 'content-type')?.value;
  if (explicitType) {
    return explicitType.split(';')[0]?.trim();
  }

  if (response._postman_previewlanguage === 'json') {
    return 'application/json';
  }

  const body = response.body?.trim();
  if (!body) return undefined;

  try {
    JSON.parse(body);
    return 'application/json';
  } catch {
    return 'text/plain';
  }
}

function inferResponses(responses: PostmanResponse[] | undefined): Record<string, any> | undefined {
  if (!responses?.length) return undefined;

  const openApiResponses: Record<string, any> = {};

  for (const response of responses) {
    const statusCode = String(response.code ?? 200);
    const contentType = inferResponseContentType(response);
    const body = response.body?.trim();

    const responseEntry: Record<string, any> = {
      description: response.status ?? response.name ?? `HTTP ${statusCode} response`,
    };

    if (contentType && body) {
      let example: unknown = body;
      if (contentType === 'application/json') {
        try {
          example = JSON.parse(body);
        } catch {
          example = body;
        }
      }

      responseEntry.content = {
        [contentType]: {
          example,
        },
      };
    }

    openApiResponses[statusCode] = responseEntry;
  }

  return Object.keys(openApiResponses).length > 0 ? openApiResponses : undefined;
}

function ensureTag(spec: OpenApiDocument, tagName: string) {
  spec.tags = Array.isArray(spec.tags) ? spec.tags : [];
  if (!spec.tags.some((tag: { name?: string }) => tag?.name === tagName)) {
    spec.tags.push({ name: tagName });
  }
}

function walkItems(spec: OpenApiDocument, items: PostmanItem[] | undefined, parentTag?: string) {
  for (const item of items ?? []) {
    const tagName = item.item ? item.name ?? parentTag ?? 'General' : parentTag ?? 'General';
    ensureTag(spec, tagName);

    if (item.item) {
      walkItems(spec, item.item, tagName);
      continue;
    }

    const request = item.request;
    const method = request?.method?.toLowerCase();
    const rawUrl = typeof request?.url === 'string' ? request.url : request?.url?.raw;
    if (!method || !rawUrl) continue;

    const normalized = normalizePath(rawUrl);
    if (!normalized) continue;

    spec.paths = spec.paths ?? {};
    spec.paths[normalized.path] = spec.paths[normalized.path] ?? {};
    const postmanRequestBody = inferRequestBody(request);
    const postmanResponses = inferResponses(item.response);

    if (spec.paths[normalized.path][method]) {
      if (!spec.paths[normalized.path][method].description && request?.description) {
        spec.paths[normalized.path][method].description = request.description;
      }
      if (!spec.paths[normalized.path][method].requestBody && postmanRequestBody) {
        spec.paths[normalized.path][method].requestBody = postmanRequestBody;
      }
      if (postmanResponses) {
        spec.paths[normalized.path][method].responses = {
          ...(spec.paths[normalized.path][method].responses ?? {}),
          ...Object.fromEntries(
            Object.entries(postmanResponses).map(([status, response]) => {
              const existing = spec.paths[normalized.path][method].responses?.[status];
              if (!existing) {
                return [status, response];
              }

              return [
                status,
                {
                  ...existing,
                  description: existing.description ?? response.description,
                  content: existing.content ?? response.content,
                },
              ];
            })
          ),
        };
      }
      continue;
    }

    const parameters = [
      ...normalized.pathParams.map((name) => ({
        in: 'path',
        name,
        required: true,
        schema: { type: 'string' },
      })),
      ...normalized.queryParams.map((param) => ({
        in: 'query',
        name: param.name,
        required: false,
        schema: { type: 'string', example: param.example },
      })),
    ];

    spec.paths[normalized.path][method] = {
      tags: [tagName],
      summary: item.name ?? `${method.toUpperCase()} ${normalized.path}`,
      description: request?.description,
      ...(parameters.length > 0 ? { parameters } : {}),
      ...(postmanRequestBody ? { requestBody: postmanRequestBody } : {}),
      responses:
        postmanResponses && Object.keys(postmanResponses).length > 0
          ? postmanResponses
          : {
              '200': {
                description: 'Successful response',
              },
            },
    };
  }
}

export function mergePostmanCollectionIntoSpec(spec: OpenApiDocument): OpenApiDocument {
  const collection = readCollection();
  if (!collection) return spec;

  const merged = {
    ...spec,
    tags: Array.isArray(spec.tags) ? [...spec.tags] : [],
    paths: spec.paths ? { ...spec.paths } : {},
  } as OpenApiDocument;

  walkItems(merged, collection.item);
  return merged;
}
