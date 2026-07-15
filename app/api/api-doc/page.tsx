// app/api-doc/page.tsx
import { getApiDocs } from '@/lib/swagger';
import ReactSwagger from './SwaggerUI';

// Make sure "default" is included right here!
export default async function ApiDocPage() {
  const spec = await getApiDocs();
  
  return (
    <main className="w-full">
      <ReactSwagger spec={spec} />
    </main>
  );
}