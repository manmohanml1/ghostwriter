import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migrationsDirectory = resolve(root, 'supabase', 'migrations');
const migrationName = /^(\d{14})_[a-z0-9_]+\.sql$/;
const requiredMigrations = [
  '20260825000000_atomic_story_sync.sql',
  '20260825010000_story_revision_conflicts.sql',
  '20260825020000_story_payload_limits.sql',
];

const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith('.sql')).sort();
const errors = [];
const timestamps = new Set();

for (const file of files) {
  const match = migrationName.exec(file);
  if (!match) {
    errors.push(`${file}: use a 14-digit timestamp and lowercase snake_case name`);
    continue;
  }
  if (timestamps.has(match[1])) errors.push(`${file}: duplicate migration timestamp ${match[1]}`);
  timestamps.add(match[1]);

  const sql = await readFile(resolve(migrationsDirectory, file), 'utf8');
  if (!sql.trim()) errors.push(`${file}: migration is empty`);
  if (/\b(service_role|SUPABASE_SERVICE_ROLE_KEY|postgres(?:ql)?:\/\/[^\s]+:[^\s]+@)/i.test(sql)) {
    errors.push(`${file}: migration appears to contain a credential or privileged application secret`);
  }
}

for (const required of requiredMigrations) {
  if (!files.includes(required)) errors.push(`${required}: required tested migration is missing`);
}

const combinedSql = await Promise.all(
  files.map((file) => readFile(resolve(migrationsDirectory, file), 'utf8')),
).then((parts) => parts.join('\n'));

for (const contract of [
  /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.sync_story_tree\s*\(/i,
  /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.sync_story_tree_v2\s*\(/i,
  /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+revision/i,
  /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.sync_story_tree_v2/i,
  /CREATE\s+CONSTRAINT\s+TRIGGER\s+tree_nodes_count_limit/i,
  /CREATE\s+CONSTRAINT\s+TRIGGER\s+lore_entities_count_limit/i,
]) {
  if (!contract.test(combinedSql)) errors.push(`migration contract is missing: ${contract}`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Validated ${files.length} ordered Supabase migrations and required sync contracts.`);
