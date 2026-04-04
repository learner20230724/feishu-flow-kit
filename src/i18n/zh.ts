// 中文 (ZH) 用户可见字符串
export const zh = {
  // Workflow 回复
  noSlashCommand: '未检测到斜杠命令。事件已记录但未触发任何操作。',
  unimplemented: (name: string) => `命令 /${name} 尚未实现。`,

  // /todo 工作流
  todoWorkflowDraft: '待办工作流草稿',
  todoRequest: (task: string) => `- 请求：${task}`,
  todoNextExtract: '- 下一步：提取具体行动项',
  todoNextAssign: '- 下一步：指定负责人和截止时间',
  todoNextPush: '- 下一步：推送至飞书文档或任务系统',

  // /doc 工作流
  docOutlineDraft: (topic: string) => `文档大纲草稿：${topic}`,
  docSummary: '# 摘要',
  docTopic: (topic: string) => `- 主题：${topic}`,
  docGoal: '- 目标：以便于粘贴到飞书文档的格式捕获请求',
  docKeyPoints: '# 关键点',
  docContext: '- 背景',
  docDecisions: '- 决策',
  docRisks: '- 风险',
  docNextActions: '# 下一步行动',
  docFillMissing: '- [ ] 补充缺失细节',
  docAssignOwner: '- [ ] 指定负责人',
  docAddTimeline: '- [ ] 添加时间线或截止日期',

  // /table 工作流
  tableWorkflowDraft: '表格工作流草稿',
  tableUsage: '用法：',
  tableUsageAdd: '- /table add <列表> <标题...> / owner=<姓名>',
  tableUsageAddOpenId: '- /table add <列表> <标题...> / owner_open_id=<open_id>',
  tableUsageEstimate: '- /table add <列表> <标题...> / estimate=<数字或文本>',
  tableUsageDue: '- /table add <列表> <标题...> / due=<YYYY-MM-DD或ISO8601>',
  tableUsageDone: '- /table add <列表> <标题...> / done=<true或false>',
  tableUsageAttachment: '- /table add <列表> <标题...> / attachment_token=<file_token或逗号分隔的file_token>',
  tableUsageLink: '- /table add <列表> <标题...> / link_record_id=<record_id或逗号分隔的record_id>',
  tableUsageMultiSelect: '- 多选列表模式下，<列表> 可用逗号分隔，如 backlog,urgent',
  tableExample: '示例：',
  tableExample1: '- /table add backlog item: 改进 webhook 错误 / owner=alex / estimate=3',
  tableExample2: '- /table add backlog 改进 webhook 错误 / owner_open_id=ou_xxx',
  tableExample3: '- /table add sprint 修复不稳定的 webhook 测试 / due=2026-04-01',
  tableExample4: '- /table add sprint 关闭不稳定的 webhook 测试 / done=true',
  tableExample5: '- /table add sprint 分享演示包 / attachment_token=file_v2_demo123,file_v2_demo456',
  tableExample6: '- /table add sprint 交付后续跟进 / link_record_id=recA123,recB456',
  tableDraftFields: '草稿字段：',
  tableNextWire: '下一步：将草稿接入真实的 Bitable 记录创建调用（可选启用）。',

  // 跳过原因（适配器层）
  tableCreateDisabled: 'FEISHU_ENABLE_TABLE_CREATE 未启用。',
  missingBitableConfig: '缺少 FEISHU_BITABLE_APP_TOKEN 或 FEISHU_BITABLE_TABLE_ID，无法创建表格记录。',
  docCreateDisabled: 'FEISHU_ENABLE_DOC_CREATE 未启用。',
  docCreateNoDocumentId: '文档创建响应中未包含 documentId。',
  outboundReplyDisabled: 'FEISHU_ENABLE_OUTBOUND_REPLY 未启用。',
  missingCredentials: '缺少 FEISHU_APP_ID 或 FEISHU_APP_SECRET，无法发送外部回复。',

  // /table 草稿字段标签
  list: (v: string) => `- 列表：${v}`,
  title: (v: string) => `- 标题：${v}`,
  details: (v: string) => `- 详情：${v}`,
  owner: (v: string) => `- 负责人：${v}`,
  ownerOpenId: (v: string) => `- 负责人 open_id：${v}`,
  estimate: (v: string) => `- 预估：${v}`,
  due: (v: string) => `- 截止：${v}`,
  done: (v: string) => `- 完成：${v}`,
  attachmentToken: (v: string) => `- 附件 token：${v}`,
  linkRecordId: (v: string) => `- 关联记录 ID：${v}`,
  listFieldMode: (v: string) => `- 列表字段模式：${v}`,
  ownerFieldMode: (v: string) => `- 负责人字段模式：${v}`,
  estimateFieldMode: (v: string) => `- 预估字段模式：${v}`,
  dueFieldMode: (v: string) => `- 截止字段模式：${v}`,
  doneFieldMode: (v: string) => `- 完成字段模式：${v}`,
  attachmentFieldMode: (v: string) => `- 附件字段模式：${v}`,
  linkFieldMode: (v: string) => `- 关联记录字段模式：${v}`,

  // /table 记录创建成功确认
  recordCreated: (recordId: string) => `✅ 记录已创建：${recordId}`,

  // Webhook 错误
  unsupportedPayload: '不支持或无效的 webhook 载荷。',
};
