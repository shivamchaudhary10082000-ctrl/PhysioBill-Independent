import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_REF_HOST = /^[a-z0-9]{20}\.supabase\.co$/;
const PLACEHOLDER = '__SUPABASE_CONNECT_SRC__';

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

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const templatePath = path.join(repoRoot, 'config', '_headers.template');
  const outputPath = path.join(repoRoot, 'dist', '_headers');
  const template = await readFile(templatePath, 'utf8');
  const occurrences = template.split(PLACEHOLDER).length - 1;

  if (occurrences !== 1) {
    throw new Error(`Expected exactly one ${PLACEHOLDER} placeholder in ${templatePath}.`);
  }

  const connectOrigins = getSupabaseCspOrigins(process.env.VITE_SUPABASE_URL);
  await writeFile(outputPath, template.replace(PLACEHOLDER, connectOrigins), 'utf8');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
