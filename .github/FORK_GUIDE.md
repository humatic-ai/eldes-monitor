# How to Establish Fork Relationships on GitHub

This project is inspired by two upstream repositories. Here's how to properly connect them on GitHub.

## Method 1: Fork Both Repositories (Recommended)

### Step 1: Fork augustas2/eldes

1. Go to https://github.com/augustas2/eldes
2. Click the "Fork" button in the top right
3. Choose your organization (humatic-ai) as the destination
4. This creates: `humatic-ai/eldes` (fork of augustas2/eldes)

### Step 2: Fork tanelvakker/eldes-cloud-api

1. Go to https://github.com/tanelvakker/eldes-cloud-api
2. Click the "Fork" button
3. Choose your organization (humatic-ai) as the destination
4. This creates: `humatic-ai/eldes-cloud-api` (fork of tanelvakker/eldes-cloud-api)

### Step 3: Link in Repository Description

In your `humatic-ai/eldes-monitor` repository:

1. Go to Settings > General
2. Update description to include:
   ```
   Fork of augustas2/eldes and tanelvakker/eldes-cloud-api - Modern Next.js ELDES monitoring
   ```

## Method 2: Add as Upstream Remotes (Already Done)

The upstream repositories are already configured as git remotes:

```bash
git remote -v
# Should show:
# origin                    https://github.com/humatic-ai/eldes-monitor.git
# upstream-augustas          https://github.com/augustas2/eldes.git
# upstream-tanelvakker        https://github.com/tanelvakker/eldes-cloud-api.git
```

## Method 3: GitHub Topics

Add topics to your repository to indicate the relationship:

1. Go to your repository on GitHub
2. Click the gear icon next to "About"
3. Add topics:
   - `fork-of:augustas2/eldes`
   - `fork-of:tanelvakker/eldes-cloud-api`
   - `eldes`
   - `esim364`
   - `monitoring`

## Method 4: Repository Settings (One Parent Only)

GitHub only allows one "forked from" relationship per repository:

1. Go to Settings > General
2. Scroll to "Danger Zone"
3. Click "Transfer ownership" or "Archive repository"
4. Note: This is not recommended as it changes ownership

**Better approach**: Use the description and topics to indicate both relationships.

## Recommended Approach

Since this project combines both upstream projects:

1. ✅ **Fork both repositories** (creates formal fork relationships)
2. ✅ **Add upstream remotes** (already done - see UPSTREAM.md)
3. ✅ **Update repository description** to mention both
4. ✅ **Add topics** to indicate relationships
5. ✅ **Document in README.md** (already done)

This way, you maintain clear attribution to both original projects while having your own independent repository.
