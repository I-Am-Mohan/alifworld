import { resolve } from 'node:path';

// Parse arguments. If first argument starts with '.env', strip it out as legacy env-file argument.
let rawArgs = Bun.argv.slice(2);
if (rawArgs.length > 0 && rawArgs[0].startsWith('.env')) {
  rawArgs = rawArgs.slice(1);
}

if (rawArgs.length === 0) {
  console.error('Usage: bun run scripts/run-with-env.ts <command> [...args]');
  process.exit(1);
}

const command = rawArgs;
const projectDirectory = process.cwd();
const dotEnvPath = resolve(projectDirectory, '.env');
const hasDotEnv = await Bun.file(dotEnvPath).exists();

const childEnvironment = { ...process.env };

// Set NODE_ENV for Next.js commands if needed
if (command[0] === 'next') {
  if (command[1] === 'dev') {
    childEnvironment.NODE_ENV = 'development';
  } else if (command[1] === 'build' || command[1] === 'start') {
    childEnvironment.NODE_ENV = 'production';
  }
}

// Prepare spawn arguments
const spawnArgs = hasDotEnv
  ? [process.execPath, `--env-file=${dotEnvPath}`, '--no-env-file', 'run', ...command]
  : [process.execPath, 'run', ...command];

if (!hasDotEnv) {
  console.info('[run-with-env] .env file not found. Executing command using environment variables.');
} else {
  console.info('[run-with-env] Loaded environment from .env file.');
}

const child = Bun.spawn(spawnArgs, {
  cwd: projectDirectory,
  env: childEnvironment,
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => child.kill(signal));
}

process.exit(await child.exited);
