# Publishing to GitHub (from a headless / no-browser environment)

This repo is ready to be pushed, but this machine may not have GitHub credentials.

If you see errors like:

- `fatal: could not read Username for 'https://github.com': No such device or address`

…it means `git` tried to use HTTPS auth but there is no interactive prompt / credential helper available.

Below are the **two reliable ways** to publish without a browser.

---

## Option A (recommended): use SSH

### 1) Ensure you have an SSH key

```bash
ls -la ~/.ssh
```

If you do not have one, generate it:

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

### 2) Add the public key to GitHub

Copy the public key:

```bash
cat ~/.ssh/id_ed25519.pub
```

Then add it in GitHub:

- Settings → SSH and GPG keys → New SSH key

### 3) Switch origin remote to SSH and push

```bash
git remote set-url origin git@github.com:learner20230724/feishu-flow-kit.git
./scripts/publish-to-github.sh
```

(SSH will work non-interactively once the key is trusted.)

---

## Option B: use HTTPS + Personal Access Token (PAT)

### 1) Create a PAT on GitHub

Create a classic token or fine-grained token that can push to repos.

### 2) Use a credential helper (simple, but stores secrets)

If you are OK storing the token locally:

```bash
git config --global credential.helper store
```

Then do one push interactively somewhere that can prompt, or pre-fill credentials.

### 3) Non-interactive one-shot push (does NOT edit git config)

If you want a one-shot push without saving credentials in git config, you can use `GIT_ASKPASS`.

Create a temporary askpass helper:

```bash
cat > /tmp/gh-askpass.sh <<'SH'
#!/usr/bin/env bash
# Git may ask for Username and Password.
# For Username: use your GitHub username.
# For Password: use your PAT.
case "$1" in
  *Username*) echo "learner20230724" ;;
  *Password*) echo "$GITHUB_TOKEN" ;;
  *) echo "" ;;
esac
SH
chmod +x /tmp/gh-askpass.sh
```

Run the push:

```bash
export GITHUB_TOKEN="<YOUR_PAT>"
GIT_ASKPASS=/tmp/gh-askpass.sh \
GIT_TERMINAL_PROMPT=0 \
./scripts/publish-to-github.sh
```

Cleanup:

```bash
rm -f /tmp/gh-askpass.sh
unset GITHUB_TOKEN
```

Security notes:
- Prefer SSH for long-term use.
- Avoid embedding tokens into the remote URL.
- Treat PATs like passwords.

---

## After the first push

1) Set repo description + topics (see `docs/github-repo-meta.md`)
2) Tag the first release:

```bash
git tag v0.1.0
git push origin v0.1.0
```
