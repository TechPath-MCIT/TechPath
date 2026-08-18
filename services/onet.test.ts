jest.mock('@/services/skills', () => ({
  getAllSkillNames: jest.fn(),
}));

import * as skillsSvc from '@/services/skills';
import { getInDemandTechnologies } from './onet';

const jsonResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ONET_API_KEY = 'test-key';
  (skillsSvc.getAllSkillNames as jest.Mock).mockResolvedValue(['Python', 'SQL']);
  global.fetch = jest.fn();
});

describe('getInDemandTechnologies', () => {
  it('returns null for a roleId with no O*NET mapping', async () => {
    expect(await getInDemandTechnologies(19)).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws when ONET_API_KEY is not configured', async () => {
    delete process.env.ONET_API_KEY;
    await expect(getInDemandTechnologies(0)).rejects.toThrow('ONET_API_KEY is not configured.');
  });

  it('throws when the API responds with a non-ok status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({}, false, 500));
    await expect(getInDemandTechnologies(0)).rejects.toThrow('O*NET API request failed with status 500.');
  });

  it('resolves aliases and filters out technologies already in the skill catalog', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({
        example: [
          { title: 'Structured Query Language SQL', percentage: 40, hot_technology: true, in_demand: true },
          { title: 'Kubernetes', percentage: 20, hot_technology: false, in_demand: true },
        ],
      }),
    );

    const result = await getInDemandTechnologies(0, 5);

    expect(result).toEqual([{ title: 'Kubernetes', percentage: 20, hotTechnology: false, inDemand: true }]);
  });

  it('caps results at the requested limit', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({
        example: [
          { title: 'Kubernetes' },
          { title: 'Terraform' },
          { title: 'Ansible' },
        ],
      }),
    );

    const result = await getInDemandTechnologies(0, 2);
    expect(result).toHaveLength(2);
  });
});
