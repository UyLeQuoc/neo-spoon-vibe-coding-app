import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { failed, ok, type TResult } from 'shared'
import { dbSchema, type IUser, usersTable } from '../schema'

export type GetOrCreateUserParams = { address: string }
export type GetOrCreateUserResult = { user: IUser }

//getOrCreateUser
export async function getOrCreateUser(db: D1Database, { address }: GetOrCreateUserParams): Promise<TResult<IUser>> {
  try {
    const drizzleDb = drizzle(db, { schema: dbSchema })
    let user = await drizzleDb
      .select({
        address: usersTable.address,
        balance: usersTable.balance,
        createdAt: usersTable.createdAt
      })
      .from(usersTable)
      .where(eq(usersTable.address, address))
      .get()
    if (!user) {
      user = await drizzleDb.insert(usersTable).values({ address }).returning().get()
    }
    return ok(user)
  } catch (e) {
    console.error('Error in getOrCreateUser:', e)
    return failed(e instanceof Error ? e.message : 'Unknown error')
  }
}

export type UpdateUserLimitBalanceParams = {
  db: D1Database
  address: string
  newBalance: number
}
export async function updateUserLimitBalance({ db, address, newBalance }: UpdateUserLimitBalanceParams) {
  return drizzle(db, { schema: dbSchema })
    .update(usersTable)
    .set({ balance: sql`${usersTable.balance} + ${newBalance}` })
    .where(eq(usersTable.address, address))
    .execute()
}
