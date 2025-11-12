import type { AppJwtPayload } from 'shared'
import { createFactory } from 'hono/factory'
import type { JwtVariables } from 'hono/jwt'

export type AppEnv = {
  Bindings: Cloudflare.Env
  Variables: JwtVariables<AppJwtPayload>
}
export const factory = createFactory<AppEnv>()
