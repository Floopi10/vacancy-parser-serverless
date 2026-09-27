import { fetch } from 'sdk';

const ROLE_PATTERNS = {
  'Community Manager': ['community manager', 'community lead', 'community associate', 'community ops', 'community operations', 'discord manager', 'telegram manager', 'комьюнити менеджер', 'менеджер сообщества'],
  Moderator: ['moderator', 'moderation', 'discord moderator', 'telegram moderator', 'community moderator', 'модератор', 'модерация'],
  Ambassador: ['ambassador', 'brand advocate', 'community advocate', 'campus ambassador', 'амбассадор'],
  Designer: ['designer', 'ui/ux', 'ux/ui', 'graphic design', 'visual design', 'motion design', 'product design', 'дизайнер'],
};
const LOCATION_PATTERNS = ['remote', 'worldwide', 'global', 'anywhere', 'work from home', 'africa', 'nigeria', 'kenya', 'ghana', 'south africa', 'egypt', 'morocco', 'tunisia', 'algeria', 'ethiopia', 'uganda', 'rwanda', 'tanzania', 'senegal', 'cameroon', 'ivory coast', 'côte d’ivoire'];

// Every entry is a verified Web3-native board. No generic job boards are used.
const SOURCES = [
  ['Cryptocurrency Jobs', 'https://cryptocurrencyjobs.co/index.xml', 'rss'],
  ['Web3Vacancy', 'https://web3vacancy.com/feeds/jobs.xml', 'web3vacancy'],
  ['Web3 Jobs by Crypto Vazima', 'https://t.me/s/web3_jobs_crypto_vazima', 'telegram'],
  ['Solana Ecosystem Jobs', 'https://jobs.solana.com/jobs', 'getro'],
  ['BNB Chain Jobs', 'https://jobs.bnbchain.org/jobs', 'getro'],
  ['Avalanche Jobs', 'https://jobs.avax.network/jobs', 'getro'],
  ['Dragonfly Jobs', 'https://jobs.dragonfly.xyz/jobs', 'getro'],
  ['Monad Ecosystem Jobs', 'https://eco-jobs.monad.xyz/jobs', 'getro'],
  ['Electric Capital Jobs', 'https://jobs.electriccapital.com/jobs', 'getro'],
  ['Multicoin Capital Jobs', 'https://jobs.multicoin.capital/jobs', 'getro'],
  ['Variant Fund Jobs', 'https://jobs.variant.fund/jobs', 'getro'],
  ['Blockchain Capital Jobs', 'https://jobs.blockchaincapital.com/jobs', 'getro'],
  ['Framework Ventures Jobs', 'https://jobs.framework.ventures/jobs', 'getro'],
  ['Placeholder VC Jobs', 'https://jobs.placeholder.vc/jobs', 'getro'],
  ['ChainJobs', 'https://chainjobs.io/jobs-data.json', 'chainjobs'],
  ['Blockchain Jobs', 'https://blockchainjobs.uk/jobs.json', 'blockchainjobs'],
  ['Coinbase Web3 Job Board', 'https://coinbase.getro.com/', 'getro'],
  ['Blockchain Association Job Board', 'https://jobs.theblockchainassociation.org/jobs', 'getro'],
  ['Sui Ecosystem Jobs', 'https://jobs.sui.io/jobs', 'getro'],
  ['Panga Capital Web3 Jobs', 'https://careers.pangacapital.com/jobs', 'getro'],
];
const BATCH_SIZE = 4;

function value(input) { return String(input ?? '').trim(); }
function stripHtml(input) {
  return value(input).replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}
function normalize(source, title, company, url, location, description) {
  return { source, title: value(title), company: value(company), url: value(url), location: value(location), description: stripHtml(description) };
}
function absoluteUrl(base, href) {
  const valueHref = value(href);
  if (!valueHref || /^https?:\/\//i.test(valueHref)) return valueHref;
  const origin = base.match(/^(https?:\/\/[^/]+)/i)?.[1] ?? '';
  if (valueHref.startsWith('/')) return `${origin}${valueHref}`;
  return `${base.replace(/\/[^/]*$/, '/')}${valueHref}`;
}
function rssTag(item, tag) {
  const match = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripHtml(match[1]) : '';
}
async function getText(url, source) {
  const response = await fetch(url, { headers: { 'User-Agent': 'TelegramVacancyParser/1.0' } });
  if (!response.ok) throw new Error(`${source}: ${response.status} ${response.statusText}`);
  return response.text();
}
async function rss([source, url], companyFromTitle = false) {
  const xml = await getText(url, source);
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => {
    const item = match[1];
    const rawTitle = rssTag(item, 'title');
    const parts = companyFromTitle ? rawTitle.match(/^(.*?)\s+at\s+(.+)$/i) : null;
    return normalize(source, parts?.[1] ?? rawTitle, parts?.[2] ?? rssTag(item, 'company'), rssTag(item, 'link') || rssTag(item, 'guid'), rssTag(item, 'location') || 'Location not specified', rssTag(item, 'description'));
  });
}
async function web3Vacancy([source, url]) {
  const xml = await getText(url, source);
  return [...xml.matchAll(/<job>([\s\S]*?)<\/job>/gi)].map((match) => {
    const item = match[1];
    return normalize(source, rssTag(item, 'title') || rssTag(item, 'name'), rssTag(item, 'company'), rssTag(item, 'url') || rssTag(item, 'link'), rssTag(item, 'location') || rssTag(item, 'region') || 'Location not specified', rssTag(item, 'description'));
  });
}
async function telegramChannel([source, url]) {
  const html = await getText(url, source);
  const cards = [...html.matchAll(/<div[^>]*class="[^"]*tgme_widget_message_wrap[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*tgme_widget_message_wrap|$)/gi)];
  return cards.map((match) => {
    const card = match[1];
    const postPath = card.match(/data-post="([^"]+)"/i)?.[1] ?? '';
    const text = card.match(/<div[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '';
    const plain = stripHtml(text);
    const title = plain.match(/(?:💼\s*)?(?:hiring|vacancy|job)\s*:\s*([\s\S]*?)(?=\s*(?:📍|🕐|📋|🔑|💡|📩|🔗)|$)/i)?.[1] ?? plain.slice(0, 180);
    const location = plain.match(/📍\s*([\s\S]*?)(?=\s*(?:🕐|📋|🔑|💡|📩|🔗)|$)/)?.[1] ?? 'Location not specified';
    return normalize(source, title, 'Crypto Vazima channel', postPath ? `https://t.me/${postPath}` : '', location, plain);
  });
}
async function jsonFeed([source, url], mapper) {
  const response = await fetch(url, { headers: { 'User-Agent': 'TelegramVacancyParser/1.0' } });
  if (!response.ok) throw new Error(`${source}: ${response.status} ${response.statusText}`);
  return mapper(await response.json(), source, url);
}
function chainJobs(data, source, url) {
  return (data.jobs ?? []).map((job) => normalize(
    source,
    job.t,
    job.c,
    absoluteUrl(url, job.u),
    job.l || (job.r ? 'Remote' : ''),
    [data.cats?.[job.k], ...(job.tg ?? []), ...(job.e ?? [])].filter(Boolean).join(' '),
  ));
}
function blockchainJobs(data, source) {
  return (data.items ?? []).map((job) => {
    const posting = job._jobposting ?? {};
    return normalize(
      source,
      posting.title || job.title,
      posting.hiringOrganization?.name || '',
      job.url || job.external_url || '',
      posting.jobLocation?.address?.addressLocality || posting.applicantLocationRequirements?.name || 'Location not specified',
      posting.description || job.content_text || job.summary || '',
    );
  });
}
async function getro([source, url]) {
  const html = await getText(url, source);
  const cards = [...html.matchAll(/<div[^>]*class="[^"]*job-card[^"]*"[^>]*data-testid="job-list-item"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*job-card|$)/gi)];
  return cards.map((match) => {
    const card = match[1];
    const href = card.match(/href="([^"]+)"[^>]*data-testid="job-title-link"/i)?.[1] ?? '';
    const title = stripHtml(card.match(/itemProp="title"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '');
    const company = card.match(/itemProp="name" content="([^"]+)"/i)?.[1] ?? '';
    const locations = [...card.matchAll(/itemProp="addressLocality" content="([^"]+)"/gi)].map((item) => item[1]).join(', ');
    const description = card.match(/itemProp="description" content="([^"]+)"/i)?.[1] ?? '';
    return normalize(source, title, company, absoluteUrl(url, href), locations || 'Location not specified', description);
  });
}
function sourceTask(source) {
  if (source[2] === 'rss') return rss(source, true);
  if (source[2] === 'web3vacancy') return web3Vacancy(source);
  if (source[2] === 'telegram') return telegramChannel(source);
  if (source[2] === 'chainjobs') return jsonFeed(source, chainJobs);
  if (source[2] === 'blockchainjobs') return jsonFeed(source, blockchainJobs);
  return getro(source);
}
async function withinTimeout(task) {
  // The Telegram Serverless isolate exposes neither setTimeout nor clearTimeout.
  // Requests in one batch still run concurrently through Promise.allSettled.
  return task;
}
function nextBatch(offset) {
  const start = Math.max(0, Number(offset) || 0) % SOURCES.length;
  return Array.from({ length: Math.min(BATCH_SIZE, SOURCES.length) }, (_, index) => SOURCES[(start + index) % SOURCES.length]);
}

export function rolesFor(vacancy) {
  // Only the advertised job title determines role fit. Descriptions frequently
  // mention designers, ambassadors, or moderators as collaborators and caused
  // unrelated engineering/sales roles to be sent as false positives.
  const title = value(vacancy.title).toLowerCase();
  return Object.entries(ROLE_PATTERNS).filter(([, phrases]) => phrases.some((phrase) => title.includes(phrase))).map(([role]) => role);
}
export function locationIsAllowed(vacancy) { const location = value(vacancy.location).toLowerCase(); return LOCATION_PATTERNS.some((phrase) => location.includes(phrase)); }export function sourceNames() { return SOURCES.map(([name]) => name).join(', '); }
export function sourceCount() { return SOURCES.length; }

export async function searchVacancies(sourceOffset = 0) {
  const scannedSources = nextBatch(sourceOffset);
  const results = await Promise.allSettled(scannedSources.map((source) => withinTimeout(sourceTask(source))));
  const errors = [];
  const byUrl = new Map();
  for (const result of results) {
    if (result.status === 'rejected') { errors.push(String(result.reason?.message ?? result.reason)); continue; }
    for (const vacancy of result.value) {
      if (vacancy.title && vacancy.url && rolesFor(vacancy).length && locationIsAllowed(vacancy)) byUrl.set(vacancy.url, vacancy);
    }
  }
  return { vacancies: [...byUrl.values()], errors, scannedSources: scannedSources.map(([name]) => name), nextOffset: (Number(sourceOffset) + BATCH_SIZE) % SOURCES.length };
}
