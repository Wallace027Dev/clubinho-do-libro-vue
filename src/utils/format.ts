/** Nota fracionada no formato pt-BR: 4.8 -> "4,8". */
export function formatRating(value: number): string {
  return value.toFixed(1).replace('.', ',')
}

/**
 * Mês/ano capitalizado a partir de uma data ("julho de 2026"). Sem data,
 * devolve o texto de fallback (livro finalizado sem `finishedAt`).
 */
export function formatMonthYear(
  dateish: string | Date | null | undefined,
  fallback = 'Finalizado'
): string {
  if (!dateish) {
    return fallback
  }

  const label = new Date(dateish).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
