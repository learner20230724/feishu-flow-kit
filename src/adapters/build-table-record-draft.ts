export interface TableRecordDraft {
  endpoint: string;
  method: 'POST';
  body: {
    fields: Record<string, string>;
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

export function buildTableRecordDraft(input: TableCommandDraftInput): TableRecordDraft {
  const fields: Record<string, string> = {
    Title: input.title,
    List: input.listName,
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
      'The starter field mapping assumes simple text fields: Title, List, Details, Owner, SourceCommand.',
    ],
  };
}
