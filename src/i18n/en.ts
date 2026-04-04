// English (EN) user-facing strings
export const en = {
  // Workflow replies
  noSlashCommand: 'No slash command found. Event accepted for logging only.',
  unimplemented: (name: string) => `Command /${name} is not implemented yet.`,

  // /todo workflow
  todoWorkflowDraft: 'Todo workflow draft',
  todoRequest: (task: string) => `- request: ${task}`,
  todoNextExtract: '- next: extract concrete action items',
  todoNextAssign: '- next: assign owner and due time',
  todoNextPush: '- next: push result into a Feishu doc or task system',

  // /doc workflow
  docOutlineDraft: (topic: string) => `Doc outline draft: ${topic}`,
  docSummary: '# Summary',
  docTopic: (topic: string) => `- Topic: ${topic}`,
  docGoal: '- Goal: capture the request in a format that is easy to paste into a Feishu doc',
  docKeyPoints: '# Key points',
  docContext: '- Context',
  docDecisions: '- Decisions',
  docRisks: '- Risks',
  docNextActions: '# Next actions',
  docFillMissing: '- [ ] Fill the missing details',
  docAssignOwner: '- [ ] Assign an owner',
  docAddTimeline: '- [ ] Add timeline or due date',

  // /table workflow
  tableWorkflowDraft: 'Table workflow draft',
  tableUsage: 'Usage:',
  tableUsageAdd: '- /table add <list> <title...> / owner=<name>',
  tableUsageAddOpenId: '- /table add <list> <title...> / owner_open_id=<open_id>',
  tableUsageEstimate: '- /table add <list> <title...> / estimate=<number-or-text>',
  tableUsageDue: '- /table add <list> <title...> / due=<YYYY-MM-DD-or-ISO8601>',
  tableUsageDone: '- /table add <list> <title...> / done=<true-or-false>',
  tableUsageAttachment: '- /table add <list> <title...> / attachment_token=<file_token-or-comma-separated-file_tokens>',
  tableUsageLink: '- /table add <list> <title...> / link_record_id=<record_id-or-comma-separated-record_ids>',
  tableUsageMultiSelect: '- in multi_select list mode, <list> can be comma-separated like backlog,urgent',
  tableExample: 'Example:',
  tableExample1: '- /table add backlog item: improve webhook errors / owner=alex / estimate=3',
  tableExample2: '- /table add backlog improve webhook errors / owner_open_id=ou_xxx',
  tableExample3: '- /table add sprint fix flaky webhook tests / due=2026-04-01',
  tableExample4: '- /table add sprint close flaky webhook tests / done=true',
  tableExample5: '- /table add sprint share demo pack / attachment_token=file_v2_demo123,file_v2_demo456',
  tableExample6: '- /table add sprint ship follow-up / link_record_id=recA123,recB456',
  tableDraftFields: 'Draft fields:',
  tableNextWire: 'Next: wire the draft into a real Bitable create-record call (opt-in).',

  // Skipped reasons (adapter layer)
  tableCreateDisabled: 'FEISHU_ENABLE_TABLE_CREATE is disabled.',
  missingBitableConfig: 'Missing FEISHU_BITABLE_APP_TOKEN or FEISHU_BITABLE_TABLE_ID for table record creation.',
  docCreateDisabled: 'FEISHU_ENABLE_DOC_CREATE is disabled.',
  docCreateNoDocumentId: 'Doc create response did not include documentId.',
  outboundReplyDisabled: 'FEISHU_ENABLE_OUTBOUND_REPLY is disabled.',
  missingCredentials: 'Missing FEISHU_APP_ID or FEISHU_APP_SECRET for outbound reply sending.',

  // /table draft field labels
  list: (v: string) => `- list: ${v}`,
  title: (v: string) => `- title: ${v}`,
  details: (v: string) => `- details: ${v}`,
  owner: (v: string) => `- owner: ${v}`,
  ownerOpenId: (v: string) => `- owner_open_id: ${v}`,
  estimate: (v: string) => `- estimate: ${v}`,
  due: (v: string) => `- due: ${v}`,
  done: (v: string) => `- done: ${v}`,
  attachmentToken: (v: string) => `- attachment_token: ${v}`,
  linkRecordId: (v: string) => `- link_record_id: ${v}`,
  listFieldMode: (v: string) => `- list field mode: ${v}`,
  ownerFieldMode: (v: string) => `- owner field mode: ${v}`,
  estimateFieldMode: (v: string) => `- estimate field mode: ${v}`,
  dueFieldMode: (v: string) => `- due field mode: ${v}`,
  doneFieldMode: (v: string) => `- done field mode: ${v}`,
  attachmentFieldMode: (v: string) => `- attachment field mode: ${v}`,
  linkFieldMode: (v: string) => `- link field mode: ${v}`,

  // /table record created confirmation
  recordCreated: (recordId: string) => `✅ Record created: ${recordId}`,

  // Webhook errors
  unsupportedPayload: 'Unsupported or invalid webhook payload.',
};

export type Strings = typeof en;
