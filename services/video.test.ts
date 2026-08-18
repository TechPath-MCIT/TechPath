jest.mock('googleapis', () => {
  const youtubeClient = {
    search: { list: jest.fn() },
    videos: { list: jest.fn() },
  };
  return { google: { youtube: jest.fn(() => youtubeClient) }, youtube_v3: {} };
});
jest.mock('@/lib/db', () => ({
  prisma: {
    role_skills: {
      updateManyAndReturn: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));
jest.mock('@/services/skills', () => ({ getSkillById: jest.fn() }));
jest.mock('@/services/roles', () => ({ getRoleById: jest.fn() }));

import { google } from 'googleapis';
import { prisma } from '@/lib/db';
import * as Skill from '@/services/skills';
import * as Role from '@/services/roles';
import { saveYouTubeVideo, getYouTubeVideo } from './video';

const youtubeClient = (google.youtube as jest.Mock).mock.results[0].value;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('saveYouTubeVideo', () => {
  it('updates the role_skills row, including duration when provided', async () => {
    await saveYouTubeVideo(10, 3, 'abc123', 5);
    expect(prisma.role_skills.updateManyAndReturn).toHaveBeenCalledWith({
      where: { Role_ID: 3, Skill_ID: 10 },
      data: expect.objectContaining({ videoid: 'abc123', videoDurationMinutes: 5 }),
    });
  });

  it('omits videoDurationMinutes entirely when duration is undefined', async () => {
    await saveYouTubeVideo(10, 3, 'abc123');
    const call = (prisma.role_skills.updateManyAndReturn as jest.Mock).mock.calls[0][0];
    expect(call.data).not.toHaveProperty('videoDurationMinutes');
  });
});

describe('getYouTubeVideo', () => {
  it('returns a fresh cached video without calling the YouTube API', async () => {
    (prisma.role_skills.findFirst as jest.Mock).mockResolvedValue({
      videoid: 'cached123',
      queryDate: new Date(),
      videoDurationMinutes: 12,
    });

    const result = await getYouTubeVideo(10, 3);

    expect(result).toEqual({ success: true, video_id: 'cached123', duration_minutes: 12, new: false });
    expect(youtubeClient.search.list).not.toHaveBeenCalled();
  });

  it('backfills a missing duration on an otherwise-fresh cached video', async () => {
    (prisma.role_skills.findFirst as jest.Mock).mockResolvedValue({
      videoid: 'cached123',
      queryDate: new Date(),
      videoDurationMinutes: null,
    });
    youtubeClient.videos.list.mockResolvedValue({ data: { items: [{ contentDetails: { duration: 'PT10M' } }] } });

    const result = await getYouTubeVideo(10, 3);

    expect(result).toEqual({ success: true, video_id: 'cached123', duration_minutes: 10, new: false });
    expect(prisma.role_skills.updateManyAndReturn).toHaveBeenCalled();
  });

  it('returns failure when there is no cache and neither skill nor role is found', async () => {
    (prisma.role_skills.findFirst as jest.Mock).mockResolvedValue(null);
    (Skill.getSkillById as jest.Mock).mockResolvedValue(null);
    (Role.getRoleById as jest.Mock).mockResolvedValue(null);

    const result = await getYouTubeVideo(10, 3);
    expect(result).toEqual({ success: false, video_id: '' });
  });

  it('searches YouTube, fetches duration, and caches the result on a fresh lookup', async () => {
    (prisma.role_skills.findFirst as jest.Mock).mockResolvedValue(null);
    (Skill.getSkillById as jest.Mock).mockResolvedValue({ name: 'Python' });
    (Role.getRoleById as jest.Mock).mockResolvedValue({ role: 'Data Scientist' });
    youtubeClient.search.list.mockResolvedValue({
      statusText: 'OK',
      data: { items: [{ id: { videoId: 'new123' } }] },
    });
    youtubeClient.videos.list.mockResolvedValue({ data: { items: [{ contentDetails: { duration: 'PT5M' } }] } });

    const result = await getYouTubeVideo(10, 3);

    expect(result).toEqual({ success: true, video_id: 'new123', duration_minutes: 5, new: true });
    expect(prisma.role_skills.updateManyAndReturn).toHaveBeenCalled();
  });

  it('returns failure when the YouTube search does not return OK', async () => {
    (prisma.role_skills.findFirst as jest.Mock).mockResolvedValue(null);
    (Skill.getSkillById as jest.Mock).mockResolvedValue({ name: 'Python' });
    (Role.getRoleById as jest.Mock).mockResolvedValue({ role: 'Data Scientist' });
    youtubeClient.search.list.mockResolvedValue({ statusText: 'ERROR' });

    const result = await getYouTubeVideo(10, 3);
    expect(result).toEqual({ success: false, video_id: '' });
  });
});
