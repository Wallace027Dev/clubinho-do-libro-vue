import { prisma } from './prisma.js'

export async function getDefaultClub() {
  return prisma.club.upsert({
    where: { name: 'Clubinho do Libro' },
    update: {},
    create: { name: 'Clubinho do Libro' }
  })
}
