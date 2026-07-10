/**
 * Seed de desenvolvimento do Clubinho do Libro.
 *
 * Cria dados suficientes para testar as 5 fases já implementadas:
 *   1. Clube + membros + livro atual  -> login e Home
 *   2. Capítulos + progresso           -> iniciar/concluir capítulo
 *   3. Feed de atividades              -> gerado ao interagir
 *   4. Comentários anti-spoiler        -> comentar capítulo concluído
 *   5. Reações                         -> reagir a comentários visíveis
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
  // Clube único.
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

  // Livro atual (só cria se ainda não houver um CURRENT).
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

  // Capítulos do livro atual.
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

  // Livro finalizado (memória de leitura) para popular o histórico (Fase 7).
  // Só cria se ainda não houver nenhum livro finalizado.
  await seedFinishedBook(club.id)

  console.log('\nSeed concluído.\n')
  console.log('Livro atual:', clubBook.book.title)
  console.log('Capítulos  :', CHAPTERS.length)
  console.log('\nContas de teste (login / senha):')
  for (const member of MEMBERS) {
    console.log(`  - ${member.login} / ${member.password}  (${member.displayName})`)
  }
  console.log('\nAdmin: acesse /login/admin e use o valor de ADMIN_PASSWORD do .env.local.')
  console.log('')
}

async function seedFinishedBook(clubId: string) {
  const existingFinished = await prisma.clubBook.findFirst({
    where: { clubId, status: 'FINISHED' }
  })

  if (existingFinished) {
    return
  }

  const ana = await prisma.user.findUnique({ where: { login: 'ana' } })
  const bruno = await prisma.user.findUnique({ where: { login: 'bruno' } })

  if (!ana || !bruno) {
    return
  }

  const finishedAt = new Date('2026-05-28T20:00:00.000Z')
  const book = await prisma.book.create({
    data: { title: 'A Biblioteca da Meia-Noite', author: 'Matt Haig' }
  })

  const clubBook = await prisma.clubBook.create({
    data: {
      clubId,
      bookId: book.id,
      status: 'FINISHED',
      selectedAt: new Date('2026-05-01T20:00:00.000Z'),
      finishedAt,
      selectedByUserId: ana.id,
      finishedByUserId: ana.id
    }
  })

  const chapters = [
    { number: 1, title: 'A biblioteca' },
    { number: 2, title: 'As vidas possiveis' },
    { number: 3, title: 'O livro dos arrependimentos' }
  ]

  const createdChapters = []
  for (const chapter of chapters) {
    createdChapters.push(
      await prisma.chapter.create({
        data: { clubBookId: clubBook.id, number: chapter.number, title: chapter.title }
      })
    )
  }

  // Ambos concluiram todos os capítulos.
  for (const user of [ana, bruno]) {
    for (const chapter of createdChapters) {
      await prisma.chapterProgress.create({
        data: {
          chapterId: chapter.id,
          userId: user.id,
          status: 'FINISHED',
          startedAt: new Date('2026-05-10T20:00:00.000Z'),
          finishedAt: new Date('2026-05-20T20:00:00.000Z')
        }
      })
    }
  }

  // Comentários arquivados no primeiro capítulo.
  const anaComment = await prisma.chapterComment.create({
    data: {
      chapterId: createdChapters[0].id,
      userId: ana.id,
      body: 'A ideia da biblioteca infinita me pegou logo de cara.'
    }
  })
  await prisma.chapterComment.create({
    data: {
      chapterId: createdChapters[0].id,
      userId: bruno.id,
      body: 'Comeco lento, mas fui fisgado no capítulo 1 mesmo.'
    }
  })

  // Uma reação ao comentário da Ana.
  await prisma.chapterCommentReaction.create({
    data: { commentId: anaComment.id, userId: bruno.id, type: 'GOSTEI' }
  })

  // Avaliações finais.
  await prisma.bookReview.create({
    data: { clubBookId: clubBook.id, userId: ana.id, rating: 5, review: 'Chorei no final. Melhor leitura do ano.' }
  })
  await prisma.bookReview.create({
    data: { clubBookId: clubBook.id, userId: bruno.id, rating: 4, review: 'Muito bom, só achei o meio arrastado.' }
  })

  await prisma.activity.create({
    data: {
      clubId,
      actorId: ana.id,
      type: 'BOOK_FINISHED',
      message: `${book.title} foi finalizado pelo clube.`,
      metadata: { bookId: book.id },
      createdAt: finishedAt
    }
  })

  console.log('Histórico    : 1 livro finalizado (A Biblioteca da Meia-Noite)')
}

main()
  .catch((error) => {
    console.error('Seed falhou:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
