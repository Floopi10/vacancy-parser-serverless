import { api } from 'sdk';
import { admit, isAllowed, runSearchForChat } from 'lib/daily';
import { sourceCount, sourceNames } from 'lib/vacancies';

async function tell(chatId, text) {
  await api.sendMessage({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true });
}

export default async function (message) {
  const chatId = message.chat?.id;
  const command = message.text?.trim().split(/\s+/)[0]?.toLowerCase();
  if (!chatId || !command) return;

  if (command === '/id') {
    await tell(chatId, `Your Telegram chat ID: <code>${chatId}</code>`);
    return;
  }
  if (command === '/start') {
    if (!(await admit(chatId))) {
      await tell(chatId, 'Access is restricted to the two approved users.');
      return;
    }
    await tell(chatId, `<b>Web3 Vacancy Parser is enabled.</b>\nRoles: Community Manager, Moderator, Ambassador, Designer.\n\nCommands:\n/now — scan the next fast batch of Web3 sources\n/sources — view all ${sourceCount()} sources\n\nLocation, including worldwide, remote, Nigeria, and Africa, is shown on every vacancy.`);
    return;
  }
  if (!(await isAllowed(chatId))) {
    await tell(chatId, 'Access is restricted to the two approved users. Send /id to share your chat ID with the owner.');
    return;
  }
  if (command === '/sources') {
    await tell(chatId, `<b>Sources (${sourceCount()}):</b> ${escapeHtml(sourceNames())}\n\nEach /now scans the next four sources, then rotates to the next batch for speed.`);
    return;
  }
  if (command === '/now') {
    await runSearchForChat(chatId, { announce: true });
    return;
  }
  await tell(chatId, 'Use /start, /now, or /sources.');
}
