import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const [envFile, ...command] = Bun.argv.slice(2);

if (!envFile || command.length === 0) {
  console.error('Usage: bun run scripts/run-with-env.ts <env-file> <command> [...args]');
  process.exit(1);
}

const projectDirectory = process.cwd();
const envFilePath = resolve(projectDirectory, envFile);

if (!(await Bun.file(envFilePath).exists())) {
  console.error(`Environment file not found: ${envFile}`);
  process.exit(1);
}

// `bun run <script>` automatically loads .env files before executing this
// runner. Remove every repository dotenv key from the inherited environment so
// the selected file is authoritative for the child process.
const childEnvironment = { ...process.env };
const dotenvFiles = (await readdir(projectDirectory)).filter(
  (fileName) => fileName === '.env' || fileName.startsWith('.env.'),
);

for (const fileName of dotenvFiles) {
  const contents = await Bun.file(resolve(projectDirectory, fileName)).text();

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);

    if (match) {
      delete childEnvironment[match[1]];
    }
  }
}

// Next.js requires a command-specific NODE_ENV. A development-targeted build
// still needs NODE_ENV=production; APP_ENV continues to describe its target.
if (command[0] === 'next') {
  if (command[1] === 'dev') {
    childEnvironment.NODE_ENV = 'development';
  } else if (command[1] === 'build' || command[1] === 'start') {
    childEnvironment.NODE_ENV = 'production';
  }
}

const child = Bun.spawn(
  [process.execPath, `--env-file=${envFilePath}`, '--no-env-file', 'run', ...command],
  {
    cwd: projectDirectory,
    env: childEnvironment,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  },
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => child.kill(signal));
}

process.exit(await child.exited);
