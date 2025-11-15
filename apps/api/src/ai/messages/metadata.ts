import z from 'zod'

export const metadataSchema = z.object({
  model: z.string(),
  sessionId: z.string().optional()
})

export type Metadata = z.infer<typeof metadataSchema>
