# NPM_TOKEN Setup Guide

**Goal:** Enable automatic npm publishing for `@feishu/plugin-template`

---

## Step 1: Get Your npmjs.com API Token

1. Go to https://www.npmjs.com/settings/tokens
2. Click **"Create New Token"**
3. Choose **"Automation"** (not "Publishing" — automation tokens work for CI/CD)
4. Give it a name like `github-actions-feishu-flow-kit`
5. Click **Generate** and copy the token (starts with `npm_`)

---

## Step 2: Add Token to GitHub Secrets

1. Go to: https://github.com/learner20230724/feishu-flow-kit/settings/secrets/actions
2. Click **"New repository secret"**
3. Fill in:
   - **Name:** `NPM_TOKEN`
   - **Secret:** paste your npm token from Step 1
4. Click **"Add secret"**

---

## Step 3: Trigger a Test Publish (optional)

After setting the secret, push a new tag to test:

```bash
cd /root/.openclaw/workspace/feishu-flow-kit
git tag v1.0.4-test && git push origin v1.0.4-test
```

This will trigger `publish-npm.yml` and publish `@feishu/plugin-template` to npm.

---

## What Happens Next

- Every `git push origin v<version>` tag will automatically:
  1. Build the plugin template
  2. Publish `@feishu/plugin-template` to npmjs.com
  3. Create/update the GitHub Release

- The token is encrypted by GitHub and only accessible to GitHub Actions.
