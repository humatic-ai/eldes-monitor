# Upstream Repository Connections

This project is inspired by and builds upon two excellent upstream projects. This document explains how to connect and sync with them.

## Upstream Repositories

1. **[augustas2/eldes](https://github.com/augustas2/eldes)** - Original ELDES monitoring implementation
2. **[tanelvakker/eldes-cloud-api](https://github.com/tanelvakker/eldes-cloud-api)** - ELDES Cloud API client library (Python)

## Git Remote Configuration

The upstream repositories have been configured as git remotes:

```bash
# View all remotes
git remote -v

# You should see:
# origin                    https://github.com/humatic-ai/eldes-monitor.git
# upstream-augustas          https://github.com/augustas2/eldes.git
# upstream-tanelvakker       https://github.com/tanelvakker/eldes-cloud-api.git
```

## Fetching from Upstream

To fetch the latest changes from upstream repositories:

```bash
# Fetch from augustas2/eldes
git fetch upstream-augustas

# Fetch from tanelvakker/eldes-cloud-api
git fetch upstream-tanelvakker
```

## Viewing Upstream Changes

```bash
# View commits from augustas2/eldes
git log upstream-augustas/main

# View commits from tanelvakker/eldes-cloud-api
git log upstream-tanelvakker/main

# Compare with upstream
git diff main upstream-augustas/main
```

## Syncing Specific Features

If you want to incorporate specific features or fixes from upstream:

```bash
# Create a branch for syncing
git checkout -b sync-upstream-augustas

# Cherry-pick specific commits
git cherry-pick <commit-hash>

# Or merge specific branches
git merge upstream-augustas/main --no-commit
```

## GitHub Fork Relationship

Since this project combines ideas from both repositories, you have a few options:

### Option 1: Fork Both Repositories (Recommended)

1. **Fork augustas2/eldes**:
   - Go to https://github.com/augustas2/eldes
   - Click "Fork" button
   - This creates a fork relationship

2. **Fork tanelvakker/eldes-cloud-api**:
   - Go to https://github.com/tanelvakker/eldes-cloud-api
   - Click "Fork" button
   - Note: GitHub only allows one parent fork, so you may need to choose which is primary

### Option 2: Set Repository Description

In your repository settings on GitHub:
1. Go to Settings > General
2. Add to description: "Fork of augustas2/eldes and tanelvakker/eldes-cloud-api"
3. Or add topics: `fork-of:augustas2/eldes`, `fork-of:tanelvakker/eldes-cloud-api`

### Option 3: Use GitHub's "Forked from" Feature

GitHub allows setting a "forked from" relationship in repository settings:
1. Go to your repository on GitHub
2. Settings > General
3. Scroll to "Danger Zone"
4. Note: This only works for one parent repository

## Contributing Back

If you make improvements that could benefit the upstream projects:

1. **For augustas2/eldes**:
   - Create a pull request to https://github.com/augustas2/eldes
   - Reference your improvements

2. **For tanelvakker/eldes-cloud-api**:
   - The TypeScript implementation in this project could be contributed
   - Create a pull request or issue suggesting a TypeScript port

## Relationship Summary

This project:
- **Inspires from**: augustas2/eldes (monitoring concepts, UI ideas)
- **Uses API patterns from**: tanelvakker/eldes-cloud-api (API client implementation)
- **Implements**: TypeScript/Next.js version combining best of both

## Keeping Up to Date

To stay informed about upstream changes:

```bash
# Add upstream remotes (if not already added)
git remote add upstream-augustas https://github.com/augustas2/eldes.git
git remote add upstream-tanelvakker https://github.com/tanelvakker/eldes-cloud-api.git

# Fetch updates periodically
git fetch upstream-augustas
git fetch upstream-tanelvakker

# Review changes
git log main..upstream-augustas/main
git log main..upstream-tanelvakker/main
```

## Notes

- This is not a direct fork but a combination/inspiration from both projects
- We maintain our own codebase while acknowledging the original work
- All attributions are properly documented in README.md and LICENSE

