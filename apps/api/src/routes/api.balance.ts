import { type DrizzleD1Database, drizzle } from 'drizzle-orm/d1'
import { ok } from 'shared'
import { dbSchema, type IUser, usersTable } from '~/db/schema'
import { factory } from '~/factory'
import { authMiddware } from '~/middlewares/auth.middleware'

export const getOrCreateUser = async (db: DrizzleD1Database<typeof dbSchema>, address: string) => {
  const user = await db.query.usersTable.findFirst({
    where: (u, { eq }) => eq(u.address, address)
  })
  if (!user) {
    const [newUser] = await db
      .insert(usersTable)
      .values({
        address,
        balance: 0
      })
      .returning()
    return newUser
  }
  return user
}

// GET /balance - Get authenticated user's balance
export const balanceRoute = factory.createApp().get('/balance', authMiddware, async c => {
  const { sub: userAddr } = c.get('jwtPayload') ?? {}

  const db = drizzle(c.env.DB, { schema: dbSchema })
  const user = await getOrCreateUser(db, userAddr)

  return c.json(ok<IUser>(user))
})
