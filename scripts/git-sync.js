const { execSync } = require('child_process');

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

run('git fetch origin');
run('git pull origin main --rebase');
run('git add .');

// Check if there are changes to commit
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (!status) {
    console.log('No changes to commit.');
  } else {
    if (run(`git commit -m "${commitMessage}"`)) {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      run(`git push origin ${branch}`);
    }
  }
} catch (error) {
  console.error('Failed to check git status or push changes.');
}
