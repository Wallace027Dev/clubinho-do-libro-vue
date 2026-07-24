/**
 * Serviço de domínio — administração de membros (criar, editar).
 *
 * Núcleos puros com as validações e o gate de login duplicado; portas para a
 * persistência (o hash da senha e o `deactivatedAt` ficam no adapter); e
 * orquestradores para o backend real. O mock reusa os núcleos e permanece
 * síncrono.
 *
 * Consistência: o núcleo decide o 409 de login duplicado a partir de um flag do
 * repositório, então o backend real passa a responder 409 (como o mock), em vez
 * do 500 por violação de unique que acontecia antes.
 */

/** Valor que pode vir pronto (mock) ou como promessa (Prisma). */
export type Awaitable<T> = T | Promise<T>

/** Senha mínima aceita (admin e troca de senha). */
export const MIN_PASSWORD_LENGTH = 6

/** Login normalizado: sempre minúsculo e sem espaços nas pontas. */
export function normalizeLogin(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

// --- Criar membro ----------------------------------------------------------

export interface CreateUserCommand {
  login: string
  password: string
  displayName: string | null
  activity: { type: 'MEMBER_CREATED'; message: string }
}

export type CreateUserDecision =
  | { ok: false; status: number; error: string }
  | { ok: true; command: CreateUserCommand }

export function resolveCreateUser(input: {
  rawLogin: unknown
  rawPassword: unknown
  rawDisplayName: unknown
  loginTaken: boolean
}): CreateUserDecision {
  const login = normalizeLogin(input.rawLogin)
  const password = typeof input.rawPassword === 'string' ? input.rawPassword : ''

  if (!login || password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: 'Informe login e senha com pelo menos 6 caracteres.'
    }
  }

  if (input.loginTaken) {
    return { ok: false, status: 409, error: 'Já existe um membro com esse login.' }
  }

  const displayName =
    typeof input.rawDisplayName === 'string' && input.rawDisplayName.trim()
      ? input.rawDisplayName.trim()
      : null

  return {
    ok: true,
    command: {
      login,
      password,
      displayName,
      activity: { type: 'MEMBER_CREATED', message: `${displayName || login} entrou no clube.` }
    }
  }
}

// --- Editar membro ---------------------------------------------------------

export interface UpdateUserCommand {
  userId: string
  changes: { deactivated?: boolean; newPassword?: string }
}

export type UpdateUserDecision =
  | { ok: false; status: number; error: string }
  | { ok: true; command: UpdateUserCommand }

export function resolveUpdateUser(input: {
  userId: string
  userExists: boolean
  rawDeactivated: unknown
  rawNewPassword: unknown
}): UpdateUserDecision {
  if (!input.userExists) {
    return { ok: false, status: 404, error: 'Membro não encontrado.' }
  }

  const changes: { deactivated?: boolean; newPassword?: string } = {}

  if (typeof input.rawDeactivated === 'boolean') {
    changes.deactivated = input.rawDeactivated
  }

  if (input.rawNewPassword !== undefined) {
    const newPassword = typeof input.rawNewPassword === 'string' ? input.rawNewPassword : ''

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return { ok: false, status: 400, error: 'A nova senha precisa ter pelo menos 6 caracteres.' }
    }

    changes.newPassword = newPassword
  }

  if (!('deactivated' in changes) && !('newPassword' in changes)) {
    return { ok: false, status: 400, error: 'Nada para atualizar.' }
  }

  return { ok: true, command: { userId: input.userId, changes } }
}

// --- Portas + orquestradores (backend real) --------------------------------

export interface AdminMembersRepository<TUser> {
  isLoginTaken(login: string): Awaitable<boolean>
  createMember(command: CreateUserCommand): Awaitable<TUser>
  memberExists(userId: string): Awaitable<boolean>
  updateMember(command: UpdateUserCommand): Awaitable<TUser>
}

export type AdminMemberResult<TUser> =
  | { ok: true; user: TUser }
  | { ok: false; status: number; error: string }

export async function createMember<TUser>(
  repo: AdminMembersRepository<TUser>,
  input: { rawLogin: unknown; rawPassword: unknown; rawDisplayName: unknown }
): Promise<AdminMemberResult<TUser>> {
  const login = normalizeLogin(input.rawLogin)
  const loginTaken = login ? await repo.isLoginTaken(login) : false

  const decision = resolveCreateUser({
    rawLogin: input.rawLogin,
    rawPassword: input.rawPassword,
    rawDisplayName: input.rawDisplayName,
    loginTaken
  })

  if (!decision.ok) {
    return decision
  }

  const user = await repo.createMember(decision.command)
  return { ok: true, user }
}

export async function updateMember<TUser>(
  repo: AdminMembersRepository<TUser>,
  input: { userId: string; rawDeactivated: unknown; rawNewPassword: unknown }
): Promise<AdminMemberResult<TUser>> {
  const userExists = await repo.memberExists(input.userId)

  const decision = resolveUpdateUser({
    userId: input.userId,
    userExists,
    rawDeactivated: input.rawDeactivated,
    rawNewPassword: input.rawNewPassword
  })

  if (!decision.ok) {
    return decision
  }

  const user = await repo.updateMember(decision.command)
  return { ok: true, user }
}
