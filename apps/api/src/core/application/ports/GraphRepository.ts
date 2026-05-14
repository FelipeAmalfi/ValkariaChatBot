export interface NpcGraphNode {
  name: string
  location?: string
  description?: string
  interests?: string[]
}

export interface LocationGraphNode {
  name: string
  description?: string
  services?: string[]
}

export interface GraphQueryCriteria {
  location?: string
  interest?: string
  sharedInterestsWith?: string
}

export interface GraphRepository {
  findNpcsByLocation(location: string): Promise<NpcGraphNode[]>
  findNpcsByInterest(interest: string): Promise<NpcGraphNode[]>
  findNpcsMatchingCriteria(criteria: GraphQueryCriteria): Promise<NpcGraphNode[]>
  findNpcsWithSharedInterests(npcName: string): Promise<NpcGraphNode[]>
  findNpcsNearNpc(npcName: string): Promise<NpcGraphNode[]>
  runQuery(cypher: string): Promise<Record<string, unknown>[]>
}
