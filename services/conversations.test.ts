jest.mock('@/lib/db', () => ({
  prisma: {
    conversation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import {
  createConversation,
  getConversationsByProfile,
  getLatestConversationByProfile,
  getConversationById,
  updateConversationContext,
  deleteConversation,
} from './conversations';

describe('createConversation', () => {
  it('defaults initialContext to [] when omitted', async () => {
    await createConversation(1, 'My chat');
    expect(prisma.conversation.create).toHaveBeenCalledWith({
      data: { profileId: 1, title: 'My chat', chatContext: [] },
    });
  });
});

describe('getConversationsByProfile', () => {
  it('orders by updatedAt desc and passes through take/skip', async () => {
    await getConversationsByProfile(1, 10, 5);
    expect(prisma.conversation.findMany).toHaveBeenCalledWith({
      where: { profileId: 1 },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      skip: 5,
    });
  });
});

describe('getLatestConversationByProfile', () => {
  it('finds the most recently updated conversation', async () => {
    await getLatestConversationByProfile(1);
    expect(prisma.conversation.findFirst).toHaveBeenCalledWith({
      where: { profileId: 1 },
      orderBy: { updatedAt: 'desc' },
    });
  });
});

describe('getConversationById', () => {
  it('looks up by conversationId', async () => {
    await getConversationById(7);
    expect(prisma.conversation.findUnique).toHaveBeenCalledWith({ where: { conversationId: 7 } });
  });
});

describe('updateConversationContext', () => {
  it('overwrites chatContext', async () => {
    const chatContext = [{ role: 'user' as const, content: 'hi' }];
    await updateConversationContext(7, chatContext);
    expect(prisma.conversation.update).toHaveBeenCalledWith({
      where: { conversationId: 7 },
      data: { chatContext },
    });
  });
});

describe('deleteConversation', () => {
  it('deletes by conversationId', async () => {
    await deleteConversation(7);
    expect(prisma.conversation.delete).toHaveBeenCalledWith({ where: { conversationId: 7 } });
  });
});
