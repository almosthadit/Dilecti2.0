const { execSync } = require('child_process');

try {
  const result = execSync('git reset --hard HEAD');
  console.log(result.toString());
} catch (error) {
  console.error('Error executing git reset:', error.message);
  if (error.stdout) console.log(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
}
