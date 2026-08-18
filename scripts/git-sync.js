const { execSync } = require('child_process');

// Skip git sync in CI environments (like Netlify, Vercel, etc.)
if (process.env.CI || process.env.NETLIFY) {
  console.log('CI environment detected. Skipping git sync.');
  process.exit(0);
}

function run(command) {
  try {
    console.log(`Running: ${command}`);
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return true;
  } catch (error) {
    console.error(`Error running command: ${command}`);
    console.error(error.stdout);
    console.error(error.stderr);
    return false;
  }
}

const timestamp = new Date().toISOString();
const commitMessage = `Auto-commit: ${timestamp}`;

console.log('Starting git sync...');

run('git add .');

// Check if there are changes to commit
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (status) {
    run(`git commit -m "${commitMessage}"`);
  }

  console.log('Syncing with remote...');
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  run('git fetch origin');

  // Try to pull from the current branch on origin
  const pullSuccess = run(`git pull origin ${branch} --rebase -X ours`);

  if (!pullSuccess) {
    console.error(`Failed to pull from origin ${branch}. Trying to pull from main...`);
    run('git pull origin main --rebase -X ours');
  }

  run(`git push origin ${branch}`);
} catch (error) {
  console.error('Failed to sync with git.');
}
