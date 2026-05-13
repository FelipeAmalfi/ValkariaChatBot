import { END, START, StateGraph } from '@langchain/langgraph'
import type { BaseCheckpointSaver } from '@langchain/langgraph'
import { ValkáriaStateAnnotation } from './state.js'
import { routeByIntent } from './router.js'
import { identifyIntentNode } from './nodes/identifyIntentNode.js'
import { responseNode } from './nodes/responseNode.js'
import type { GraphDependencies } from './dependencies.js'

export function buildValkáriaGraph(
  deps: GraphDependencies,
  checkpointer?: BaseCheckpointSaver,
) {
  const graph = new StateGraph(ValkáriaStateAnnotation)

  graph
    .addNode('identifyIntent', identifyIntentNode(deps))
    .addNode('response', responseNode(deps))
    .addEdge(START, 'identifyIntent')
    .addConditionalEdges('identifyIntent', routeByIntent, {
      response: 'response',
    })
    .addEdge('response', END)

  return graph.compile({ checkpointer })
}

export type ValkáriaGraph = ReturnType<typeof buildValkáriaGraph>
