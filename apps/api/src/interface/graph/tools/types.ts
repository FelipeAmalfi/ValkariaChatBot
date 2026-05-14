export type ToolInput = Record<string, unknown>

export interface ToolOutput {
  success: boolean
  data?: unknown
  error?: string
  correlationId: string
}

export interface Tool<TInput extends ToolInput = ToolInput> {
  name: string
  description: string
  execute(input: TInput, correlationId: string): Promise<ToolOutput>
}

export type ToolRegistry = Map<string, Tool>
