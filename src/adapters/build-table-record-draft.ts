export type TableListFieldMode = 'text' | 'single_select' | 'multi_select';
export type TableOwnerFieldMode = 'text' | 'user';
export type TableEstimateFieldMode = 'text' | 'number';
export type TableDueFieldMode = 'text' | 'date' | 'datetime';
export type TableDoneFieldMode = 'text' | 'checkbox';
export type TableAttachmentFieldMode = 'text' | 'attachment';
export type TableLinkFieldMode = 'text' | 'linked_record';

export interface TableSingleSelectFieldValue {
  name: string;
}

export type TableMultiSelectFieldValue = TableSingleSelectFieldValue[];

export interface TableUserFieldMemberValue {
  id: string;
}

export type TableUserFieldValue = TableUserFieldMemberValue[];

export interface TableAttachmentFieldItemValue {
  file_token: string;
}

export type TableAttachmentFieldValue = TableAttachmentFieldItemValue[];

export interface TableLinkedRecordFieldValue {
  link_record_ids: string[];
}

export type TableRecordFieldValue = string | number | boolean | TableSingleSelectFieldValue | TableMultiSelectFieldValue | TableUserFieldValue | TableAttachmentFieldValue | TableLinkedRecordFieldValue;

export interface TableRecordDraft {
  endpoint: string;
  method: 'POST';
  body: {
    fields: Record<string, TableRecordFieldValue>;
  };
  notes: string[];
}

export interface TableCommandDraftInput {
  listName: string;
  title: string;
  details?: string;
  owner?: string;
  ownerOpenId?: string;
  estimate?: string;
  due?: string;
  done?: string;
  attachmentToken?: string;
  linkRecordId?: string;
  sourceCommand: string;
}

export interface BuildTableRecordDraftOptions {
  listFieldMode?: TableListFieldMode;
  ownerFieldMode?: TableOwnerFieldMode;
  estimateFieldMode?: TableEstimateFieldMode;
  dueFieldMode?: TableDueFieldMode;
  doneFieldMode?: TableDoneFieldMode;
  attachmentFieldMode?: TableAttachmentFieldMode;
  linkFieldMode?: TableLinkFieldMode;
}

function buildListFieldValue(
  listName: string,
  mode: TableListFieldMode,
): TableRecordFieldValue {
  if (mode === 'single_select') {
    return {
      name: listName,
    };
  }

  if (mode === 'multi_select') {
    const values = listName
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => ({ name: value }));

    if (values.length > 0) {
      return values;
    }
  }

  return listName;
}

function buildOwnerFieldValue(
  input: TableCommandDraftInput,
  mode: TableOwnerFieldMode,
): TableRecordFieldValue | undefined {
  if (mode === 'user') {
    if (!input.ownerOpenId) return undefined;
    return [
      {
        id: input.ownerOpenId,
      },
    ];
  }

  if (!input.owner) return undefined;
  return input.owner;
}

function buildEstimateFieldValue(
  input: TableCommandDraftInput,
  mode: TableEstimateFieldMode,
): TableRecordFieldValue | undefined {
  if (!input.estimate) return undefined;

  if (mode === 'number') {
    const parsed = Number(input.estimate);
    if (!Number.isFinite(parsed)) return undefined;
    return parsed;
  }

  return input.estimate;
}

function parseDueAsDateTimestamp(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return undefined;
  }

  return timestamp;
}

function parseDueAsDatetimeTimestamp(value: string) {
  const parsed = Date.parse(value.trim());
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function buildDueFieldValue(
  input: TableCommandDraftInput,
  mode: TableDueFieldMode,
): TableRecordFieldValue | undefined {
  if (!input.due) return undefined;

  if (mode === 'date') {
    return parseDueAsDateTimestamp(input.due);
  }

  if (mode === 'datetime') {
    return parseDueAsDatetimeTimestamp(input.due);
  }

  return input.due;
}

function parseDoneAsCheckbox(value: string) {
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'done', 'checked'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'todo', 'open', 'unchecked'].includes(normalized)) return false;
  return undefined;
}

function buildDoneFieldValue(
  input: TableCommandDraftInput,
  mode: TableDoneFieldMode,
): TableRecordFieldValue | undefined {
  if (!input.done) return undefined;

  if (mode === 'checkbox') {
    return parseDoneAsCheckbox(input.done);
  }

  return input.done;
}

function buildAttachmentFieldValue(
  input: TableCommandDraftInput,
  mode: TableAttachmentFieldMode,
): TableRecordFieldValue | undefined {
  if (!input.attachmentToken) return undefined;

  if (mode === 'attachment') {
    const values = input.attachmentToken
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => ({ file_token: value }));

    if (values.length > 0) {
      return values;
    }

    return undefined;
  }

  return input.attachmentToken;
}

function buildLinkFieldValue(
  input: TableCommandDraftInput,
  mode: TableLinkFieldMode,
): TableRecordFieldValue | undefined {
  if (!input.linkRecordId) return undefined;

  if (mode === 'linked_record') {
    const values = input.linkRecordId
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length > 0) {
      return {
        link_record_ids: values,
      };
    }

    return undefined;
  }

  return input.linkRecordId;
}

export function buildTableRecordDraft(
  input: TableCommandDraftInput,
  options: BuildTableRecordDraftOptions = {},
): TableRecordDraft {
  const listFieldMode = options.listFieldMode ?? 'text';
  const ownerFieldMode = options.ownerFieldMode ?? 'text';
  const estimateFieldMode = options.estimateFieldMode ?? 'text';
  const dueFieldMode = options.dueFieldMode ?? 'text';
  const doneFieldMode = options.doneFieldMode ?? 'text';
  const attachmentFieldMode = options.attachmentFieldMode ?? 'text';
  const linkFieldMode = options.linkFieldMode ?? 'text';
  const fields: Record<string, TableRecordFieldValue> = {
    Title: input.title,
    List: buildListFieldValue(input.listName, listFieldMode),
    SourceCommand: input.sourceCommand,
  };

  if (input.details) {
    fields.Details = input.details;
  }

  const ownerFieldValue = buildOwnerFieldValue(input, ownerFieldMode);
  if (ownerFieldValue) {
    fields.Owner = ownerFieldValue;
  }

  const estimateFieldValue = buildEstimateFieldValue(input, estimateFieldMode);
  if (estimateFieldValue !== undefined) {
    fields.Estimate = estimateFieldValue;
  }

  const dueFieldValue = buildDueFieldValue(input, dueFieldMode);
  if (dueFieldValue !== undefined) {
    fields.Due = dueFieldValue;
  }

  const doneFieldValue = buildDoneFieldValue(input, doneFieldMode);
  if (doneFieldValue !== undefined) {
    fields.Done = doneFieldValue;
  }

  const attachmentFieldValue = buildAttachmentFieldValue(input, attachmentFieldMode);
  if (attachmentFieldValue !== undefined) {
    fields.Attachment = attachmentFieldValue;
  }

  const linkFieldValue = buildLinkFieldValue(input, linkFieldMode);
  if (linkFieldValue !== undefined) {
    fields.LinkedRecords = linkFieldValue;
  }

  const notes = [
    'Local-first draft only. Replace {app_token} and {table_id} before wiring to a real Bitable write.',
  ];

  const widenedModes: string[] = [];
  if (listFieldMode === 'single_select') {
    widenedModes.push('List is emitted as a single-select payload ({ name: value })');
  }
  if (listFieldMode === 'multi_select') {
    widenedModes.push('List is emitted as a multi-select payload ([{ name }]) using comma-separated list values');
  }
  if (ownerFieldMode === 'user') {
    widenedModes.push('Owner is emitted as a Bitable user field payload ([{ id }])');
  }
  if (estimateFieldMode === 'number') {
    widenedModes.push('Estimate is emitted as a numeric payload');
  }
  if (dueFieldMode === 'date') {
    widenedModes.push('Due is emitted as a UTC date timestamp payload (milliseconds)');
  }
  if (dueFieldMode === 'datetime') {
    widenedModes.push('Due is emitted as a datetime timestamp payload (milliseconds)');
  }
  if (doneFieldMode === 'checkbox') {
    widenedModes.push('Done is emitted as a checkbox payload (boolean)');
  }
  if (attachmentFieldMode === 'attachment') {
    widenedModes.push('Attachment is emitted as a Bitable attachment payload ([{ file_token }]) using comma-separated file tokens');
  }
  if (linkFieldMode === 'linked_record') {
    widenedModes.push('LinkedRecords is emitted as a Bitable linked-record payload ({ link_record_ids }) using comma-separated record IDs');
  }

  if (widenedModes.length > 0) {
    notes.push(
      `${widenedModes.join('. ')}. Title, Details, and SourceCommand still assume text-compatible fields.`,
    );
  } else {
    notes.push(
      'The starter field mapping assumes simple text fields: Title, List, Details, Owner, Estimate, Due, Done, Attachment, LinkedRecords, SourceCommand.',
    );
  }

  return {
    endpoint: '/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records',
    method: 'POST',
    body: {
      fields,
    },
    notes,
  };
}
