import { gql } from '@apollo/client'

export const CHAT_MUTATION = gql`
  mutation Chat($message: String!, $threadId: String) {
    chat(message: $message, threadId: $threadId) {
      response
      threadId
      intent
    }
  }
`

export interface ChatResponse {
  response: string
  threadId: string
  intent?: string
}

export interface ChatMutationResult {
  chat: ChatResponse
}
