// app/api-doc/SwaggerUI.tsx
'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

type Props = {
  spec: Record<string, any>;
};

export default function ReactSwagger({ spec }: Props) {
  return (
    <div className="bg-white min-h-screen p-2">
      <SwaggerUI spec={spec} />
    </div>
  );
}