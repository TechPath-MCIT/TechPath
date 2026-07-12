// lib/swagger.ts
import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'app/api', // Instructs the compiler to scan your entire api subdirectory matrix
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'TechPath API Specifications',
        version: '1.0.0',
        description: 'Automated documentation map for our full-stack engineering engine.',
      },
    },
  });
  return spec;
};