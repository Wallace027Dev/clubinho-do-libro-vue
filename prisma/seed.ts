/**
 * Seed de desenvolvimento do Clubinho do Libro.
 *
 * Cria dados suficientes para testar as 5 fases ja implementadas:
 *   1. Clube + membros + livro atual  -> login e Home
 *   2. Capitulos + progresso           -> iniciar/concluir capitulo
 *   3. Feed de atividades              -> gerado ao interagir
 *   4. Comentarios anti-spoiler        -> comentar capitulo concluido
 *   5. Reacoes                         -> reagir a comentarios visiveis
 *
 * Idempotente: pode rodar varias vezes sem duplicar (usa upsert por login/nome).
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const CLUB_NAME = 'Clubinho do Libro'

const MEMBERS = [
  { login: 'ana', password: '123456', displayName: 'Ana' },
  { login: 'bruno', password: '123456', displayName: 'Bruno' }
]

const BOOK = { title: 'O Nome do Vento', author: 'Patrick Rothfuss' }

const CHAPTERS = [
  { number: 1, title: 'Um lugar para demonios' },
  { number: 2, title: 'Um dia belo e tranquilo' },
  { number: 3, title: 'Madeira e palavra' },
  { number: 4, title: 'Rumo a Tarbean' },
  { number: 5, title: 'Notas' }
]

async function main() {
  // Clube unico.
  const club = await prisma.club.upsert({
    where: { name: CLUB_NAME },
    update: {},
    create: { name: CLUB_NAME }
  })

  // Membros pre-cadastrados.
  for (const member of MEMBERS) {
    const passwordHash = await bcrypt.hash(member.password, 12)
    await prisma.user.upsert({
      where: { login: member.login },
      update: { displayName: member.displayName },
      create: {
        login: member.login,
        passwordHash,
        displayName: member.displayName,
        role: 'MEMBER'
      }
    })
  }

  // Livro atual (so cria se ainda nao houver um CURRENT).
  const existingCurrent = await prisma.clubBook.findFirst({
    where: { clubId: club.id, status: 'CURRENT' },
    include: { book: true }
  })

  let clubBook = existingCurrent

  if (!clubBook) {
    const book = await prisma.book.create({
      data: { title: BOOK.title, author: BOOK.author }
    })

    clubBook = await prisma.clubBook.create({
      data: {
        clubId: club.id,
        bookId: book.id,
        status: 'CURRENT'
      },
      include: { book: true }
    })

    await prisma.activity.create({
      data: {
        clubId: club.id,
        type: 'BOOK_SELECTED',
        message: `${book.title} virou o livro atual do clube.`,
        metadata: { bookId: book.id }
      }
    })
  }

  // Capitulos do livro atual.
  for (const chapter of CHAPTERS) {
    await prisma.chapter.upsert({
      where: {
        clubBookId_number: {
          clubBookId: clubBook.id,
          number: chapter.number
        }
      },
      update: { title: chapter.title },
      create: {
        clubBookId: clubBook.id,
        number: chapter.number,
        title: chapter.title
      }
    })
  }

  console.log('\nSeed concluido.\n')
  console.log('Livro atual:', clubBook.book.title)
  console.log('Capitulos  :', CHAPTERS.length)
  console.log('\nContas de teste (login / senha):')
  for (const member of MEMBERS) {
    console.log(`  - ${member.login} / ${member.password}  (${member.displayName})`)
  }
  console.log('\nAdmin: acesse /login/admin e use o valor de ADMIN_PASSWORD do .env.local.')
  console.log('')
}

main()
  .catch((error) => {
    console.error('Seed falhou:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
