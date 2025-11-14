import { createFactory } from 'hono/factory'
import type { JwtVariables } from 'hono/jwt'
import type { AppJwtPayload } from 'shared'

export type AppEnv = {
  Bindings: Cloudflare.Env
  Variables: JwtVariables<AppJwtPayload>
}
export const factory = createFactory<AppEnv>()
