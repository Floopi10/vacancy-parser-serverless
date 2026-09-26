import runDailyDigest from 'lib/daily';

// The local scheduler invokes this with {} through the authenticated CLI.
// Real Telegram inline updates are ignored and cannot start a digest.
export default async function (input) {
  if (input?.from) return { ignored: true };
  return runDailyDigest();
}
