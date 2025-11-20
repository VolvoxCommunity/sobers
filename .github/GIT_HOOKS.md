# Git Hooks Documentation

## Overview

This project uses **Husky** and **lint-staged** to automatically format and lint code before commits. This ensures code quality and consistency across the codebase.

## What Happens on Commit

When you run `git commit`, the following automatic checks run on **staged files only**:

1. **Prettier** formats all staged files (`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.md`)
2. **ESLint** lints and auto-fixes staged TypeScript/JavaScript files

If any changes are made by these tools, they are automatically added to your commit.

## Setup

The git hooks are automatically set up when you run:

```bash
pnpm install
```

This triggers the `prepare` script which initializes Husky.

## Configuration

### Husky Configuration

Hook scripts are located in `.husky/`:

- `.husky/pre-commit` - Runs before each commit

### lint-staged Configuration

Configured in `package.json` under the `lint-staged` key:

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["prettier --write", "eslint --fix"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

## Bypassing Hooks (Not Recommended)

If absolutely necessary, you can skip the pre-commit hook:

```bash
git commit -n -m "Your commit message"
# or
git commit --no-verify -m "Your commit message"
```

**⚠️ Warning**: Bypassing hooks may result in CI failures. Only skip hooks if you know what you're doing.

## Troubleshooting

### Hook Not Running

If the pre-commit hook doesn't run automatically:

1. Ensure Husky is initialized:

   ```bash
   pnpm prepare
   ```

2. Verify the hook is executable:

   ```bash
   ls -la .husky/pre-commit
   chmod +x .husky/pre-commit
   ```

3. Check that the `.husky` directory exists and is tracked by git

### Formatting/Linting Errors

If the hook fails due to linting errors that can't be auto-fixed:

1. Review the error messages in the terminal
2. Fix the issues manually
3. Stage the changes: `git add .`
4. Retry the commit

### Stash Conflicts

If you see git stash errors during commit:

```
error: Entry 'file.txt' not uptodate. Cannot merge.
```

This means you have unstaged changes that conflict with the hook's stash operation. Either:

1. **Stage all changes**: `git add .` (recommended)
2. **Stash unstaged changes**: `git stash push -u -m "temp"`
3. **Commit staged files**
4. **Restore stashed changes**: `git stash pop`

### Slow Commits

If commits are slow with many files:

- lint-staged only runs on **staged files**, not the entire codebase
- Consider committing smaller, focused changesets
- If a specific file is slow to lint, check for complex patterns or large file size

## Testing the Hook

You can test the pre-commit hook manually:

```bash
# Create a test file with formatting issues
echo "const    foo   =   'bar'  ;" > test.ts

# Stage it
git add test.ts

# Try to commit (hook will auto-format)
git commit -m "Test commit"

# Verify formatting was applied
cat test.ts
# Should show: const foo = 'bar';

# Clean up
git rm test.ts
git commit -m "Remove test file"
```

## CI/CD Integration

The same checks run in CI (GitHub Actions):

- `pnpm lint` - Checks for linting errors
- `pnpm format:check` - Verifies formatting

If the pre-commit hook runs successfully, CI checks should pass.

## Related Scripts

All these commands can be run manually:

```bash
pnpm format              # Auto-format all files
pnpm format:check        # Check formatting without modifying
pnpm lint                # Run ESLint
pnpm lint --fix          # Auto-fix linting issues
pnpm typecheck           # TypeScript type checking
```

## Why Use Git Hooks?

✅ **Consistency**: Ensures all code follows the same style
✅ **Prevents bad commits**: Catches issues before they reach CI
✅ **Saves time**: Auto-fixes most formatting issues
✅ **Team collaboration**: Reduces code review friction
✅ **CI efficiency**: Faster pipelines with fewer failures

## Additional Resources

- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/lint-staged/lint-staged)
- [Prettier Documentation](https://prettier.io/)
- [ESLint Documentation](https://eslint.org/)
