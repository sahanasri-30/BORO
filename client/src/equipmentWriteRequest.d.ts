export function equipmentWriteRequest(editingId: string | undefined, data: Record<string, unknown>): {
  path: string;
  method: 'POST' | 'PUT';
  data: Record<string, unknown>;
};
