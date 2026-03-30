export type TableListFieldMode = 'text' | 'single_select';

export interface TableSingleSelectFieldValue {
  name: string;
}

export type TableRecordFieldValue = string | TableSingleSelectFieldValue;

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
  sourceCommand: string;
}

export interface BuildTableRecordDraftOptions {
  listFieldMode?: TableListFieldMode;
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

export function buildTableRecordDraft(
  input: TableCommandDraftInput,
  options: BuildTableRecordDraftOptions = {},
): TableRecordDraft {
  const listFieldMode = options.listFieldMode ?? 'text';
  const fields: Record<string, TableRecordFieldValue> = {
    Title: input.title,
    List: buildListFieldValue(input.listName, listFieldMode),
    SourceCommand: input.sourceCommand,
  };

  if (input.details) {
    fields.Details = input.details;
  }

  if (input.owner) {
    fields.Owner = input.owner;
  }

  return {
    endpoint: '/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records',
    method: 'POST',
    body: {
      fields,
    },
    notes: [
      'Local-first draft only. Replace {app_token} and {table_id} before wiring to a real Bitable write.',
      listFieldMode === 'single_select'
        ? 'List is emitted as a single-select payload ({ name: value }). Title, Details, Owner, and SourceCommand still assume text-compatible fields.'
        : 'The starter field mapping assumes simple text fields: Title, List, Details, Owner, SourceCommand.',
    ],
  };
}
