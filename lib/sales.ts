export function mapSaleDoc(id: string, data: any) {
  return {
    id,
    type: data.type,
    prescriptionId: data.prescriptionId ?? null,
    patientId: data.patientId ?? null,
    patientName: data.patientName ?? null,
    items: data.items ?? [],
    total: data.total ?? 0,
    paymentMethod: data.paymentMethod,
    soldBy: data.soldBy,
    soldByName: data.soldByName,
    receiptUrl: data.receiptUrl ?? null,
    createdAt: data.createdAt?.toMillis?.() ?? 0,
  };
}
