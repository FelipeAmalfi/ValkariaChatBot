import { END, START, StateGraph } from '@langchain/langgraph'
import type { BaseCheckpointSaver } from '@langchain/langgraph'
import { ValkáriaStateAnnotation } from './state.js'
import { routeAfterSanitize, routeAfterIntent, routeAfterCypherExecute, routeAfterPlanner } from './router.js'
import { sanitizeNode } from './nodes/sanitizeNode.js'
import { identifyIntentNode } from './nodes/identifyIntentNode.js'
import { sessionLoadNode } from './nodes/sessionLoadNode.js'
import { identityFlowNode } from './nodes/identityFlowNode.js'
import { simpleRetrievalNode } from './nodes/simpleRetrievalNode.js'
import { plannerNode } from './nodes/plannerNode.js'
import { memoryNode } from './nodes/memoryNode.js'
import { narrativeResponseNode } from './nodes/narrativeResponseNode.js'
import { graphRetrievalNode } from './nodes/graphRetrievalNode.js'
import { cypherGenerateNode } from './nodes/cypherGenerateNode.js'
import { cypherExecuteNode } from './nodes/cypherExecuteNode.js'
import { retrievalOrchestratorNode } from './nodes/retrievalOrchestratorNode.js'
import { turnPersistenceNode } from './nodes/turnPersistenceNode.js'
import { affinityNode } from './nodes/affinityNode.js'
import { recommendationNode } from './nodes/recommendationNode.js'
import { feedbackNode } from './nodes/feedbackNode.js'
import type { GraphDependencies } from './dependencies.js'

export function buildValkáriaGraph(
  deps: GraphDependencies,
  checkpointer?: BaseCheckpointSaver,
) {
  const graph = new StateGraph(ValkáriaStateAnnotation)

  graph
    // ── Node registration ────────────────────────────────────────────────────
    .addNode('sanitize', sanitizeNode())
    .addNode('identifyIntent', identifyIntentNode(deps))
    .addNode('sessionLoad', sessionLoadNode(deps))
    .addNode('identityFlow', identityFlowNode(deps))
    .addNode('graphRetrieval', graphRetrievalNode(deps))
    .addNode('cypherGenerate', cypherGenerateNode(deps))
    .addNode('cypherExecute', cypherExecuteNode(deps))
    .addNode('simpleRetrieval', simpleRetrievalNode(deps))
    .addNode('planner', plannerNode(deps))
    .addNode('retrievalOrchestrator', retrievalOrchestratorNode(deps))
    .addNode('memoryNode', memoryNode(deps))
    .addNode('narrativeResponse', narrativeResponseNode(deps))
    .addNode('turnPersistence', turnPersistenceNode(deps))
    .addNode('affinityNode', affinityNode(deps))
    .addNode('recommendationNode', recommendationNode(deps))
    .addNode('feedbackNode', feedbackNode(deps))

    // ── Edge wiring ──────────────────────────────────────────────────────────
    // Entry point
    .addEdge(START, 'sanitize')

    // After sanitize: blocked → END, otherwise → identifyIntent
    .addConditionalEdges('sanitize', routeAfterSanitize, {
      identifyIntent: 'identifyIntent',
      __end__: END,
    })

    // After identifyIntent: always load session before routing
    .addEdge('identifyIntent', 'sessionLoad')

    // After sessionLoad: route based on intent + complexity
    .addConditionalEdges('sessionLoad', routeAfterIntent, {
      identityFlow: 'identityFlow',
      cypherGenerate: 'cypherGenerate',
      graphRetrieval: 'graphRetrieval',
      simpleRetrieval: 'simpleRetrieval',
      planner: 'planner',
      memoryNode: 'memoryNode',
      affinityNode: 'affinityNode',
      narrativeResponse: 'narrativeResponse',
      recommendationNode: 'recommendationNode',
      feedbackNode: 'feedbackNode',
    })

    // Identity flow feeds into narrative response for a consistent response node
    .addEdge('identityFlow', 'narrativeResponse')

    // Graph/lore retrieval feeds into narrative response
    .addEdge('graphRetrieval', 'narrativeResponse')

    // Text-to-Cypher pipeline: generate → execute → [retry or done]
    .addEdge('cypherGenerate', 'cypherExecute')
    .addConditionalEdges('cypherExecute', routeAfterCypherExecute, {
      cypherGenerate: 'cypherGenerate',
      narrativeResponse: 'narrativeResponse',
    })

    // Simple retrieval feeds into narrative response
    .addEdge('simpleRetrieval', 'narrativeResponse')

    // Planner routes to orchestrator (when plan generated) or simpleRetrieval (fallback)
    .addConditionalEdges('planner', routeAfterPlanner, {
      retrievalOrchestrator: 'retrievalOrchestrator',
      simpleRetrieval: 'simpleRetrieval',
    })

    // Affinity node feeds into narrative response
    .addEdge('affinityNode', 'narrativeResponse')

    // Recommendation node feeds into narrative response for rich narrative output
    .addEdge('recommendationNode', 'narrativeResponse')

    // Feedback node goes straight to persistence — no narrative needed
    .addEdge('feedbackNode', 'turnPersistence')

    // Orchestrator feeds into narrative response
    .addEdge('retrievalOrchestrator', 'narrativeResponse')

    // Turn persistence after all response paths
    .addEdge('narrativeResponse', 'turnPersistence')
    .addEdge('memoryNode', 'turnPersistence')
    .addEdge('turnPersistence', END)

  return graph.compile({ checkpointer })
}

export type ValkáriaGraph = ReturnType<typeof buildValkáriaGraph>
