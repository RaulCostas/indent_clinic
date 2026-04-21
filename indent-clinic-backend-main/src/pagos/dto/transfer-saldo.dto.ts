export class TransferSaldoDto {
    sourcePacienteId: number;
    sourceProformaId?: number;
    targetPacienteId: number;
    targetProformaId?: number;
    amount: number;
}
