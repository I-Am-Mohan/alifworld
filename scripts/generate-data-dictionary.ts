/**
 * AlifWorld Database Data Dictionary Generator
 * 
 * Automatically compiles the authoritative PostgreSQL & Prisma Data Dictionary
 * from prisma/schema.prisma, lifecycle policies, and index registries.
 * 
 * Invariants: ADR-0022, ADR-0028, ADR-0029, Phase 03 Data Architecture
 */

import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { MODEL_DELETION_POLICIES } from '../src/shared/database/lifecycle';

interface FieldMeta {
  name: string;
  type: string;
  isOptional: boolean;
  isUnique: boolean;
  defaultVal?: string;
  attributes: string[];
}

interface ModelMeta {
  name: string;
  tableName: string;
  description: string;
  deletionPolicy: string;
  fields: FieldMeta[];
  indexes: string[];
  uniques: string[];
}

export function parsePrismaSchema(): ModelMeta[] {
  const schemaPath = resolve(process.cwd(), 'prisma/schema.prisma');
  const content = readFileSync(schemaPath, 'utf-8');
  const lines = content.split('\n');

  const models: ModelMeta[] = [];
  let currentModel: ModelMeta | null = null;
  let currentDoc = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('///')) {
      currentDoc = line.replace(/^\/\/\/\s*/, '').trim();
      continue;
    }

    if (line.startsWith('model ')) {
      const modelName = line.split(/\s+/)[1];
      currentModel = {
        name: modelName,
        tableName: modelName.toLowerCase(),
        description: currentDoc || `${modelName} domain entity`,
        deletionPolicy: MODEL_DELETION_POLICIES[modelName] || 'SOFT_DELETE',
        fields: [],
        indexes: [],
        uniques: [],
      };
      currentDoc = '';
      continue;
    }

    if (currentModel) {
      if (line === '}') {
        models.push(currentModel);
        currentModel = null;
        continue;
      }

      if (line.startsWith('@@map(')) {
        const match = line.match(/@@map\("([^"]+)"\)/);
        if (match) currentModel.tableName = match[1];
        continue;
      }

      if (line.startsWith('@@index(')) {
        currentModel.indexes.push(line);
        continue;
      }

      if (line.startsWith('@@unique(')) {
        currentModel.uniques.push(line);
        continue;
      }

      // Column field line
      if (line.length > 0 && !line.startsWith('//')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const fieldName = parts[0];
          const rawType = parts[1];
          const isOptional = rawType.endsWith('?');
          const isArray = rawType.endsWith('[]');
          const cleanType = rawType.replace(/[?\[\]]/g, '');

          const defaultMatch = line.match(/@default\(([^)]+)\)/);
          const defaultVal = defaultMatch ? defaultMatch[1] : undefined;
          const isUnique = line.includes('@unique');

          currentModel.fields.push({
            name: fieldName,
            type: `${cleanType}${isArray ? '[]' : ''}`,
            isOptional,
            isUnique,
            defaultVal,
            attributes: parts.slice(2),
          });
        }
      }
    }
  }

  return models;
}

export function generateDataDictionaryMarkdown(): string {
  const models = parsePrismaSchema();

  let md = `# AlifWorld Production PostgreSQL Data Dictionary

**Authoritative Specification**: Phase 03 - Data Architecture  
**Database**: PostgreSQL 16 (Managed AWS Aurora / RDS compatible)  
**ORM**: Prisma 5.20+ with raw connection poolers  
**Monetary Precision**: Integer minor units (poisha, where $1\\text{ BDT} = 100\\text{ poisha}$)  
**Total Canonical Models**: ${models.length} Models  
**Reference Invariants**: ADR-0003, ADR-0022, ADR-0027, ADR-0028, ADR-0029, ADR-0030  

---

## 1. Overview & Deletion Policy Taxonomy

AlifWorld classifies all relational tables into three strict lifecycle deletion categories:

| Deletion Policy | Description | Audit Strategy |
|---|---|---|
| **IMMUTABLE** | Append-only financial ledgers, audit logs, order snapshots, and payments. Updates and deletions (hard or soft) are strictly forbidden at the database and application boundary. | Compensating reversal entries (e.g. \`reversalOfId\`) |
| **SOFT_DELETE** | Core master domain entities (users, sellers, categories, products, orders). Never physically deleted; tracked via \`deletedAt\` and \`deletedBy\` timestamps. | Optimistic concurrency (\`version\`) + Tombstones |
| **EPHEMERAL** | Operational probes, telemetry, auth OTP tokens, and temporary cache sessions. Purged via automated TTL background tasks. | Scheduled retention sweeps |

---

## 2. Model & Table Summary Index

| # | Model Name | Database Table | Lifecycle Policy | Primary Entity Purpose |
|---|---|---|---|---|
`;

  models.forEach((m, idx) => {
    md += `| ${idx + 1} | \`${m.name}\` | \`${m.tableName}\` | **${m.deletionPolicy}** | ${m.description} |\n`;
  });

  md += `\n---\n\n## 3. Comprehensive Entity & Attribute Dictionary\n\n`;

  for (const m of models) {
    md += `### ${m.name} (\`${m.tableName}\`)\n\n`;
    md += `**Purpose**: ${m.description}  \n`;
    md += `**Lifecycle Deletion Policy**: \`${m.deletionPolicy}\`  \n\n`;

    md += `| Column Name | Type | Nullable | Default | Constraints & Relations |\n`;
    md += `|---|---|---|---|---|\n`;

    for (const f of m.fields) {
      const nullableStr = f.isOptional ? 'Yes' : 'No';
      const defStr = f.defaultVal ? `\`${f.defaultVal}\`` : '-';
      const constraints: string[] = [];
      if (f.attributes.some((a) => a.startsWith('@id'))) constraints.push('PRIMARY KEY');
      if (f.isUnique) constraints.push('UNIQUE');
      if (f.attributes.some((a) => a.startsWith('@relation'))) constraints.push('FOREIGN KEY');

      md += `| \`${f.name}\` | \`${f.type}\` | ${nullableStr} | ${defStr} | ${constraints.join(', ') || '-'} |\n`;
    }

    if (m.indexes.length > 0 || m.uniques.length > 0) {
      md += `\n**Indexes & Constraints**:\n`;
      for (const u of m.uniques) md += `- Unique: \`${u}\`\n`;
      for (const idx of m.indexes) md += `- Index: \`${idx}\`\n`;
    }

    md += `\n---\n\n`;
  }

  md += `## 4. Expand-and-Contract Migration Workflow

To support zero-downtime deployments under high concurrent traffic, AlifWorld strictly enforces the **Expand-and-Contract (Parallel Run)** database migration pattern:

1. **Phase 1: Expand (Additive Migration)**
   - Add new columns as optional (\`nullable\`) or with safe default values.
   - Deploy code that dual-writes to both legacy and new structures.
2. **Phase 2: Backfill**
   - Run asynchronous batch backfill jobs to populate historical rows.
3. **Phase 3: Contract (Subtractive Migration)**
   - Make new columns non-nullable.
   - Remove legacy column reads from application code.
   - Drop deprecated columns in a scheduled maintenance window.

---

## 5. Rollback & Forward-Fix Playbook

- **Standard Procedure: Forward-Fix**: For non-destructive schema anomalies, author and deploy a new timestamped migration (\`migration.sql\`).
- **Emergency Rollback**: If a deployment fails before code cutover, re-apply the previous migration snapshot using an idempotent migration script.
- **Strict Prohibition**: Never run \`prisma migrate reset\` in staging or production environments.
`;

  return md;
}

export function writeDataDictionary(): void {
  const outputPath = resolve(process.cwd(), 'docs/database/data-dictionary.md');
  mkdirSync(dirname(outputPath), { recursive: true });
  const content = generateDataDictionaryMarkdown();
  writeFileSync(outputPath, content, 'utf-8');
  console.info(`[DataDictionary] Authoritative PostgreSQL Data Dictionary generated at: ${outputPath}`);
}

if (import.meta.main || process.argv[1]?.includes('generate-data-dictionary')) {
  writeDataDictionary();
}
