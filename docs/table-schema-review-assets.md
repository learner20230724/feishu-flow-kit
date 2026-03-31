# `/table` schema review assets

This page is the release-facing index for the static `/table` schema review assets in `feishu-flow-kit`.

Use it when you need to decide **which asset to link, embed, crop, or refresh** without reopening the longer schema handoff docs.

It covers the three review-first assets that now sit on top of the advanced handoff fixture chain:

- `docs/demo-table-schema-handoff-review.png`
- `docs/demo-table-schema-review-page.png`
- `docs/demo-table-schema-review-share-card.png`

For the full review flow, keep using:
- [`/table` schema handoff demo](./table-schema-handoff-demo.md)
- [`/table` schema review page](./table-schema-review-page.md)
- [`/table` schema handoff review checklist](./table-schema-handoff-review-checklist.md)

---

## Quick chooser

| If you need... | Use this asset |
| --- | --- |
| the clearest end-to-end review flow | `demo-table-schema-handoff-review.png` |
| a dense single-page review board | `demo-table-schema-review-page.png` |
| a lighter hero / link-preview / issue-cover crop | `demo-table-schema-review-share-card.png` |

---

## 1. Handoff review flow

![Table schema handoff review demo](./demo-table-schema-handoff-review.png)

**Best for:**
- README demo section
- setup notes that need the whole path in one image
- explaining how raw field-list export becomes reviewable mapping output

**What it emphasizes:**
- raw field list → normalized schema → mapping draft → review gate
- the three main review signals: `optionCount`, `rawSemanticType=datetime`, `rawSemanticType=duplex_link`
- the idea that this repo is review-first, not live discovery

**Use this when:**
- someone is seeing the `/table` schema handoff path for the first time
- you want one image that still reads as a workflow, not just a screenshot

---

## 2. Full review-page snapshot

![Table schema review page snapshot](./demo-table-schema-review-page.png)

**Best for:**
- docs pages
- PR comments or issue threads where the reviewer wants more detail in one capture
- setup notes that need both the warning signals and the minimum verification loop

**What it emphasizes:**
- a denser review surface
- quoteable warning blocks
- the smallest `.env` decision loop before enabling real writes

**Use this when:**
- the reader already understands the repo shape
- you want a screenshot that feels closer to the actual review page than a stylized card

---

## 3. Share-card crop

![Table schema review share card](./demo-table-schema-review-share-card.png)

**Best for:**
- README hero crops
- GitHub issue links
- setup-note embeds
- release notes or social cards where vertical space is tight

**What it emphasizes:**
- the highest-signal warning content only
- a smaller footprint than the full review-page snapshot
- a crop that stays readable even when the host UI trims the edges

**Use this when:**
- the full review-page snapshot feels too dense
- the embed target is likely to crop, shrink, or preview the image automatically

---

## HTML snapshot targets

If you want a browser-render target instead of a static PNG, use:

- [`table-schema-review-snapshot.html`](./table-schema-review-snapshot.html)
- [`table-schema-review-snapshot.zh-CN.html`](./table-schema-review-snapshot.zh-CN.html)

These are the better starting points for:
- manual screenshots
- browser-based embeds
- issue links where you want selectable surrounding text
- Chinese setup notes without translating surrounding copy by hand

---

## Refresh commands

Refresh all exported PNG assets:

```bash
npm run docs:export-assets
```

Export one asset only:

```bash
npm run docs:export-svg-png -- ./docs/demo-table-schema-handoff-review.svg --out ./docs/demo-table-schema-handoff-review.png
npm run docs:export-svg-png -- ./docs/demo-table-schema-review-page.svg --out ./docs/demo-table-schema-review-page.png
npm run docs:export-svg-png -- ./docs/demo-table-schema-review-share-card.svg --out ./docs/demo-table-schema-review-share-card.png
```

---

## Verification loop

Before treating any of these assets as release-ready evidence, run:

```bash
npm run docs:export-assets
npm run verify:table-schema-handoff
npm run verify:release
```

That keeps the asset exports, fixture-backed review chain, and public repo surface in sync.
