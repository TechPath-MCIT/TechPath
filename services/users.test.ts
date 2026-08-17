jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import { syncUserFromClerk, getUserByClerkId, getUserWithProfileByClerkId, linkProfileToUser } from './users';

const input = { clerkId: 'clerk_1', username: 'zhenhua', useremail: 'z@example.com' };

describe('syncUserFromClerk', () => {
  it('upserts on clerkId with the given username/email', async () => {
    await syncUserFromClerk(input);
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { clerkId: 'clerk_1' },
      update: { username: 'zhenhua', useremail: 'z@example.com' },
      create: input,
    });
  });
});

describe('getUserByClerkId', () => {
  it('looks up by clerkId', async () => {
    await getUserByClerkId('clerk_1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { clerkId: 'clerk_1' } });
  });
});

describe('getUserWithProfileByClerkId', () => {
  it('includes the profile and its dreamRole in one query', async () => {
    await getUserWithProfileByClerkId('clerk_1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { clerkId: 'clerk_1' },
      include: { profile: { include: { dreamRole: true } } },
    });
  });
});

describe('linkProfileToUser', () => {
  it('sets profile_ID on the user row', async () => {
    await linkProfileToUser('clerk_1', 42);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { clerkId: 'clerk_1' }, data: { profile_ID: 42 } });
  });
});
