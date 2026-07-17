const https = require('https');
const dns = require('dns');
const { URL } = require('url');
const { promisify } = require('util');

dns.setDefaultResultOrder('ipv4first');

const lookupAsync = promisify(dns.lookup);

function parseRetryAfterMs(errorMessage) {
  const match = String(errorMessage || '').match(/try again in ([\d.]+)s/i);
  if (!match) return null;
  return Math.ceil(parseFloat(match[1]) * 1000) + 500;
}

function isRetryableNetworkError(error) {
  const code = error?.cause?.code || error?.code || '';
  const message = String(error?.message || '');
  return (
    code === 'ENOTFOUND'
    || code === 'ECONNRESET'
    || code === 'ETIMEDOUT'
    || code === 'EAI_AGAIN'
    || code === 'UND_ERR_CONNECT_TIMEOUT'
    || message.includes('fetch failed')
    || message.includes('Request timed out')
  );
}

function isRetryableOpenAiError(error, response, bodyText) {
  if (isRetryableNetworkError(error)) return true;
  const status = response?.status;
  if (status === 429 || status === 503) return true;
  const message = String(bodyText || error?.message || '');
  return /rate limit|try again in/i.test(message);
}

function httpsRequestWithResolvedIp(urlString, options = {}) {
  const parsedUrl = new URL(urlString);
  const body = options.body;

  return lookupAsync(parsedUrl.hostname, { family: 4 }).then(({ address }) => new Promise((resolve, reject) => {
    const req = https.request({
      hostname: address,
      servername: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        ...options.headers,
        Host: parsedUrl.hostname,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          headers: res.headers,
          json: async () => JSON.parse(text),
          text: async () => text,
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(120000, () => {
      req.destroy(new Error('Request timed out'));
    });

    if (body) req.write(body);
    req.end();
  }));
}

/**
 * OpenAI HTTP client with IPv4 DNS resolution and retries for flaky networks.
 */
async function fetchOpenAiWithRetry(url, options, retryOptions = {}) {
  const maxAttempts = retryOptions.maxAttempts ?? 5;
  const baseDelayMs = retryOptions.baseDelayMs ?? 1500;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await httpsRequestWithResolvedIp(url, options);
      if (response.ok) return response;

      const bodyText = await response.text();
      if (isRetryableOpenAiError(null, response, bodyText) && attempt < maxAttempts) {
        const retryMs = parseRetryAfterMs(bodyText) || baseDelayMs * attempt * 2;
        console.warn(`[openai-fetch] Attempt ${attempt} rate limited (${response.status}). Retrying in ${retryMs}ms…`);
        await new Promise((resolve) => setTimeout(resolve, retryMs));
        continue;
      }

      const err = new Error(bodyText || `OpenAI request failed (${response.status})`);
      err.responseStatus = response.status;
      throw err;
    } catch (error) {
      lastError = error;

      if (!isRetryableNetworkError(error) || attempt === maxAttempts) {
        break;
      }

      const delayMs = baseDelayMs * attempt;
      console.warn(`[openai-fetch] Attempt ${attempt} failed (${error.code || error.message}). Retrying in ${delayMs}ms…`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const code = lastError?.cause?.code || lastError?.code || '';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    throw new Error(
      'Cannot reach OpenAI (DNS/network error). Check your internet connection, VPN, or firewall, then try again.'
    );
  }
  if (code === 'ETIMEDOUT' || String(lastError?.message || '').includes('timed out')) {
    throw new Error('OpenAI request timed out. Check your network connection and try again.');
  }

  throw lastError || new Error('OpenAI request failed');
}

module.exports = { fetchOpenAiWithRetry };
