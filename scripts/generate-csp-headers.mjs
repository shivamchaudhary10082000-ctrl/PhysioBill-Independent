import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_REF_HOST = /^[a-z0-9]{20}\.supabase\.co$/;
const TURNSTILE_SITE_KEY_PATTERN = /^[A-Za-z0-9_-]{10,100}$/;
const SUPABASE_PLACEHOLDER = '__SUPABASE_CONNECT_SRC__';
const TURNSTILE_SCRIPT_PLACEHOLDER = '__TURNSTILE_SCRIPT_SRC__';
const TURNSTILE_FRAME_PLACEHOLDER = '__TURNSTILE_FRAME_SRC__';
const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';

export function getSupabaseCspOrigins(rawUrl) {
  if (!rawUrl?.trim()) {
    throw new Error('VITE_SUPABASE_URL is required to generate the frontend CSP.');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('VITE_SUPABASE_URL must be a valid absolute URL.');
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash ||
    !PROJECT_REF_HOST.test(parsed.hostname)
  ) {
    throw new Error(
      'VITE_SUPABASE_URL must be the canonical HTTPS origin for a Supabase project.',
    );
  }

  const httpsOrigin = parsed.origin;
  const wssOrigin = `wss://${parsed.host}`;
  return `${httpsOrigin} ${wssOrigin}`;
}

export function getTurnstileCspValues(rawSiteKey) {
  const siteKey = rawSiteKey?.trim();

  if (!siteKey) {
    return {
      scriptSource: '',
      frameSource: "'none'",
    };
  }

  if (!TURNSTILE_SITE_KEY_PATTERN.test(siteKey)) {
    throw new Error('VITE_TURNSTILE_SITE_KEY is malformed.');
  }

  // Cloudflare's standard Turnstile CSP guidance requires only the challenge
  // origin in script-src and frame-src. connect-src remains self + the exact
  // Supabase origins for this integration.
  return {
    scriptSource: ` ${TURNSTILE_ORIGIN}`,
    frameSource: TURNSTILE_ORIGIN,
  };
}

function assertSinglePlaceholder(template, placeholder, templatePath) {
  const occurrences = template.split(placeholder).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Expected exactly one ${placeholder} placeholder in ${templatePath}.`);
  }
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const templatePath = path.join(repoRoot, 'config', '_headers.template');
  const outputPath = path.join(repoRoot, 'dist', '_headers');
  const template = await readFile(templatePath, 'utf8');

  assertSinglePlaceholder(template, SUPABASE_PLACEHOLDER, templatePath);
  assertSinglePlaceholder(template, TURNSTILE_SCRIPT_PLACEHOLDER, templatePath);
  assertSinglePlaceholder(template, TURNSTILE_FRAME_PLACEHOLDER, templatePath);

  const connectOrigins = getSupabaseCspOrigins(process.env.VITE_SUPABASE_URL);
  const turnstile = getTurnstileCspValues(process.env.VITE_TURNSTILE_SITE_KEY);

  const rendered = template
    .replace(SUPABASE_PLACEHOLDER, connectOrigins)
    .replace(TURNSTILE_SCRIPT_PLACEHOLDER, turnstile.scriptSource)
    .replace(TURNSTILE_FRAME_PLACEHOLDER, turnstile.frameSource);

  if (
    rendered.includes(SUPABASE_PLACEHOLDER) ||
    rendered.includes(TURNSTILE_SCRIPT_PLACEHOLDER) ||
    rendered.includes(TURNSTILE_FRAME_PLACEHOLDER)
  ) {
    throw new Error('CSP generation left unresolved placeholders.');
  }

  await writeFile(outputPath, rendered, 'utf8');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
