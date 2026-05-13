import { randomUUID } from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'
import { ChatMessageSchema } from '../schemas/chatSchemas.js'
import type { ValkáriaGraph } from '../../graph/builder.js'

export interface ChatControllerDeps {
  graph: ValkáriaGraph
}

export function ChatController(deps: ChatControllerDeps): FastifyPluginAsync {
  return async (app) => {
    app.post('/chat', async (req, reply) => {
      const body = ChatMessageSchema.parse(req.body)
      const threadId = body.threadId ?? randomUUID()

      const result = await deps.graph.invoke(
        { message: body.message },
        { configurable: { thread_id: threadId } },
      )

      return reply.status(200).send({
        response: result.response ?? 'No response generated.',
        threadId,
        intent: result.intent,
      })
    })
  }
}
