'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

type Props = {
  url: string;
};

export default function SwaggerDocs({ url }: Props) {
  return <SwaggerUI url={url} docExpansion="list" defaultModelsExpandDepth={1} />;
}
