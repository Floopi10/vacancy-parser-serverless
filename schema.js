import { table, integer, text, sql } from 'sdk/db';

export const subscriptions = table('subscriptions', {
  chatId: integer('chat_id').primaryKey(),
  sourceOffset: integer('source_offset').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const deliveries = table('deliveries', {
  id: text('id').primaryKey(),
  chatId: integer('chat_id').notNull(),
  url: text('url').notNull(),
  sentAt: integer('sent_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const allowedUsers = table('allowed_users', {
  chatId: integer('chat_id').primaryKey(),
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
