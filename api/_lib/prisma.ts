import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

let client: PrismaClient | null = null

function getClient(): PrismaClient {
  if (client) {
    return client
  }

  client = globalForPrisma.prisma ?? new PrismaClient()

  // Em dev, reaproveita entre reloads para não abrir conexão a cada troca.
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }

  return client
}

/**
 * Cliente Prisma criado **na primeira consulta**, não no import do módulo.
 *
 * Antes era `new PrismaClient()` no topo do arquivo. Como todas as rotas vivem
 * numa única serverless function, qualquer problema na construção do cliente
 * (não gerado no deploy, `DATABASE_URL` ausente) estourava no import e derrubava
 * a API inteira com FUNCTION_INVOCATION_FAILED — inclusive rotas que não tocam o
 * banco e até o 404 do roteador, o que esconde a causa em vez de mostrá-la.
 *
 * Com a criação preguiçosa, o mesmo problema vira erro na rota que de fato
 * precisa do banco, e o resto da API continua respondendo.
 *
 * O Proxy existe para o uso continuar idêntico nos pontos que já importam daqui
 * (`prisma.user.findMany(...)`, `prisma.$transaction(...)`).
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const real = getClient() as unknown as Record<string | symbol, unknown>
    const value = real[property]

    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value
  }
})
