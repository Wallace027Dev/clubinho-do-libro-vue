/**
 * Falha quando um import relativo dentro do caminho da API não termina em `.js`.
 *
 * Por que isso existe: a serverless function é carregada pelo Node em ESM, que
 * NÃO resolve extensão faltante. Um `from '../chapterStructure'` sobe local
 * (tsc, vite, vitest e tsx toleram) e derruba a API inteira em produção com
 * `ERR_MODULE_NOT_FOUND` no carregamento do módulo — inclusive as rotas que nem
 * usam aquele arquivo, porque o roteador importa todas.
 *
 * Escopo: `api/` e `src/domain/`, que são o que o Node carrega. O resto de
 * `src/` é resolvido pelo Vite e pode continuar sem extensão.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const RAIZES = ['api', join('src', 'domain')]
const IMPORT_RELATIVO = /(?:from|import)\s*\(?\s*['"](\.\.?\/[^'"]*)['"]/g

function arquivosTs(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)

    if (statSync(caminho).isDirectory()) {
      return arquivosTs(caminho)
    }

    return caminho.endsWith('.ts') && !caminho.endsWith('.test.ts') ? [caminho] : []
  })
}

const problemas = []

for (const raiz of RAIZES) {
  for (const arquivo of arquivosTs(raiz)) {
    const linhas = readFileSync(arquivo, 'utf8').split(/\r?\n/)

    linhas.forEach((linha, indice) => {
      for (const [, especificador] of linha.matchAll(IMPORT_RELATIVO)) {
        if (!especificador.endsWith('.js') && !especificador.endsWith('.json')) {
          problemas.push(`${relative('.', arquivo)}:${indice + 1}  ${especificador}`)
        }
      }
    })
  }
}

if (problemas.length > 0) {
  console.error(
    `\nImport relativo sem extensão .js em ${problemas.length} lugar(es).\n` +
      'O Node em ESM não resolve isso, e a função de /api cai inteira em produção:\n'
  )
  for (const problema of problemas) {
    console.error('  ' + problema)
  }
  console.error('\nAcrescente .js ao especificador (ex.: "../chapterStructure.js").\n')
  process.exit(1)
}

console.log('Imports relativos de api/ e src/domain/: todos com .js')
