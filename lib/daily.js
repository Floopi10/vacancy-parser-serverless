import { api, db } from 'sdk';
import { eq } from 'sdk/db';
import { allowedUsers, deliveries, subscriptions } from 'schema';
import { rolesFor, searchVacancies } from 'lib/vacancies';

const MAX_RESULTS = 10;
const MAX_USERS = 2;

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function deliveryId(chatId, url) { return `${chatId}:${url}`; }
function format(vacancy) {
  return `<b>${escapeHtml(vacancy.title)}</b>\n🏢 ${escapeHtml(vacancy.company || 'Company not specified')}\n📍 ${escapeHtml(vacancy.location || 'Location not specified')}\n🎯 ${escapeHtml(rolesFor(vacancy).join(', '))}\n🔗 <a href="${escapeHtml(vacancy.url)}">Open vacancy</a>\n<i>Source: ${escapeHtml(vacancy.source)}</i>`;
}
async function tell(chatId, text) {
  await api.sendMessage({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true });
}
async function getSubscription(chatId) {
  await db.insert(subscriptions).values({ chatId }).onConflictDoNothing({ target: subscriptions.chatId }).run();
  return db.select().from(subscriptions).where(eq(subscriptions.chatId, chatId)).get();
}

export async function isAllowed(chatId) {
  return Boolean(await db.select().from(allowedUsers).where(eq(allowedUsers.chatId, chatId)).get());
}

export async function admit(chatId) {
  if (await isAllowed(chatId)) return true;
  if ((await db.$count(allowedUsers)) >= MAX_USERS) return false;
  await db.insert(allowedUsers).values({ chatId }).onConflictDoNothing({ target: allowedUsers.chatId }).run();
  return isAllowed(chatId);
}

export async function runSearchForChat(chatId, { announce = false } = {}) {
  const subscription = await getSubscription(chatId);
  if (announce) await tell(chatId, '🔎 Searching the next batch of Web3 vacancies…');
  const { vacancies, errors, scannedSources, nextOffset } = await searchVacancies(subscription?.sourceOffset ?? 0);
  await db.update(subscriptions).set({ sourceOffset: nextOffset, updatedAt: new Date() }).where(eq(subscriptions.chatId, chatId)).run();
  let sent = 0;
  for (const vacancy of vacancies) {
    if (sent >= MAX_RESULTS) break;
    const id = deliveryId(chatId, vacancy.url);
    const alreadySent = await db.select().from(deliveries).where(eq(deliveries.id, id)).get();
    if (alreadySent) continue;
    await tell(chatId, format(vacancy));
    await db.insert(deliveries).values({ id, chatId, url: vacancy.url }).run();
    sent += 1;
  }
  const unavailable = errors.length ? ` Sources unavailable: ${errors.length}.` : '';
  const summary = sent ? `Daily digest: sent ${sent} new vacancy matches.\nScanned: ${escapeHtml(scannedSources.join(', '))}.${unavailable}` : `Daily digest: no new matching vacancies in this batch.\nScanned: ${escapeHtml(scannedSources.join(', '))}.${unavailable}`;
  await tell(chatId, summary);
  return { sent, errors: errors.length, scannedSources };
}

export default async function () {
  const users = await db.select().from(allowedUsers).all();
  const results = [];
  for (const user of users) {
    try {
      results.push({ chatId: user.chatId, ...(await runSearchForChat(user.chatId)) });
    } catch (error) {
      console.error('daily digest failed', user.chatId, error);
      results.push({ chatId: user.chatId, error: String(error?.message ?? error) });
    }
  }
  return { recipients: users.length, results };
}
