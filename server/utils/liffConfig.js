function normalizeLiffId(raw) {
  return String(raw || '').trim();
}

/**
 * LINE LIFF ID 格式為「ChannelId-字串」，不可只填 Channel ID（純數字）
 */
function isValidLiffId(id) {
  const value = normalizeLiffId(id);
  if (!value) return false;
  if (/^[0-9]+$/.test(value)) return false;
  return /^[0-9]{6,12}-[a-zA-Z0-9_-]+$/.test(value);
}

function getPublicLiffConfig() {
  const raw = normalizeLiffId(process.env.LINE_LIFF_ID);
  const valid = isValidLiffId(raw);
  let lineLiffConfigError = '';
  if (raw && !valid) {
    lineLiffConfigError = 'LINE_LIFF_ID 格式錯誤：請使用 LINE Developers 建立的 LIFF ID（例如 1234567890-AbCdEfGh），不可只填 Channel ID。';
  }

  return {
    lineLiffId: valid ? raw : '',
    lineLiffIdValid: valid,
    lineLiffConfigError,
    lineCustomerNotifyEnabled: Boolean(String(process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim()),
  };
}

module.exports = { isValidLiffId, getPublicLiffConfig };
