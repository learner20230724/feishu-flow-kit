export type TableListFieldMode = 'text' | 'single_select';
export type TableOwnerFieldMode = 'text' | 'user';
export type TableEstimateFieldMode = 'text' | 'number';

export interface TableSingleSelectFieldValue {
  name: string;
}

export interface TableUserFieldMemberValue {
  id: string;
}

export type TableUserFieldValue = TableUserFieldMemberValue[];

export type TableRecordFieldValue = string | number | TableSingleSelectFieldValue | TableUserFieldValue;

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
  sourceCommand: string;
}

export interface BuildTableRecordDraftOptions {
  listFieldMode?: TableListFieldMode;
  ownerFieldMode?: TableOwnerFieldMode;
  estimateFieldMode?: TableEstimateFieldMode;
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

export function buildTableRecordDraft(
  input: TableCommandDraftInput,
  options: BuildTableRecordDraftOptions = {},
): TableRecordDraft {
  const listFieldMode = options.listFieldMode ?? 'text';
  const ownerFieldMode = options.ownerFieldMode ?? 'text';
  const estimateFieldMode = options.estimateFieldMode ?? 'text';
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

  const notes = [
    'Local-first draft only. Replace {app_token} and {table_id} before wiring to a real Bitable write.',
  ];

  const widenedModes: string[] = [];
  if (listFieldMode === 'single_select') {
    widenedModes.push('List is emitted as a single-select payload ({ name: value })');
  }
  if (ownerFieldMode === 'user') {
    widenedModes.push('Owner is emitted as a Bitable user field payload ([{ id }])');
  }
  if (estimateFieldMode === 'number') {
    widenedModes.push('Estimate is emitted as a numeric payload');
  }

  if (widenedModes.length > 0) {
    notes.push(
      `${widenedModes.join('. ')}. Title, Details, and SourceCommand still assume text-compatible fields.`,
    );
  } else {
    notes.push(
      'The starter field mapping assumes simple text fields: Title, List, Details, Owner, Estimate, SourceCommand.',
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
