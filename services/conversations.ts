// services/conversations.ts
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
};

/**
 * Creates a new conversation thread for a profile.
 * @param profileId the profile this conversation belongs to
 * @param title optional display title for the thread
 * @param initialContext the starting message history (defaults to empty)
 */
export async function createConversation(profileId: number, title?: string, initialContext: ChatMessage[] = []) {
    return prisma.conversation.create({
        data: {
            profileId,
            title,
            chatContext: initialContext as unknown as Prisma.InputJsonValue,
        },
    });
}

/**
 * Fetches conversations for a profile, most recently updated first.
 * @param profileId the profile to list conversations for
 * @param take optional cap on how many of the most recent conversations to return
 */
export async function getConversationsByProfile(profileId: number, take?: number) {
    return prisma.conversation.findMany({
        where: { profileId },
        orderBy: { updatedAt: 'desc' },
        take,
    });
}

/**
 * Fetches the most recently updated conversation for a profile, if any.
 * @param profileId the profile to look up
 */
export async function getLatestConversationByProfile(profileId: number) {
    return prisma.conversation.findFirst({
        where: { profileId },
        orderBy: { updatedAt: 'desc' },
    });
}

/**
 * Fetches a single conversation matching a specific ID parameter
 */
export async function getConversationById(conversationId: number) {
    return prisma.conversation.findUnique({
        where: { conversationId },
    });
}

/**
 * Overwrites a conversation's message history with the full updated array.
 * @param conversationId the conversation to update
 * @param chatContext the full, merged message history to persist
 */
export async function updateConversationContext(conversationId: number, chatContext: ChatMessage[]) {
    return prisma.conversation.update({
        where: { conversationId },
        data: {
            chatContext: chatContext as unknown as Prisma.InputJsonValue,
        },
    });
}

/**
 * Deletes a conversation thread.
 * @param conversationId the conversation to delete
 */
export async function deleteConversation(conversationId: number) {
    return prisma.conversation.delete({
        where: { conversationId },
    });
}
