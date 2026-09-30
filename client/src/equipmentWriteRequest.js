export function equipmentWriteRequest(editingId, data) {
  return editingId
    ? {path: `/equipment/${editingId}`, method: 'PUT', data}
    : {path: '/equipment', method: 'POST', data};
}
