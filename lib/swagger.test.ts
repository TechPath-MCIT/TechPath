jest.mock('next-swagger-doc', () => ({ createSwaggerSpec: jest.fn(() => ({ openapi: '3.0.0' })) }));

import { createSwaggerSpec } from 'next-swagger-doc';
import { getApiDocs } from './swagger';

describe('getApiDocs', () => {
  it('builds and returns the swagger spec scanning app/api', async () => {
    const spec = await getApiDocs();
    expect(createSwaggerSpec).toHaveBeenCalledWith(
      expect.objectContaining({ apiFolder: 'app/api' }),
    );
    expect(spec).toEqual({ openapi: '3.0.0' });
  });
});
