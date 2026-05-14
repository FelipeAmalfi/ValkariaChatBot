export interface CypherValidationResult {
  allowed: boolean
  sanitizedQuery?: string
  reason?: string
}

const WRITE_OPS = /\b(CREATE|MERGE|DELETE|SET|REMOVE|DROP)\b/i
const CALL_OPS = /\bCALL\b/i
const APOC = /\bapoc\b/i
const DBMS = /\bdbms\b/i
const LOAD_CSV = /\bLOAD\s+CSV\b/i
const HAS_RETURN = /\bRETURN\b/i
const HAS_LIMIT = /\bLIMIT\b/i
const IS_AGGREGATION = /\b(count\(|collect\(|sum\(|avg\()/i

export class CypherGuardrail {
  static validate(query: string): CypherValidationResult {
    if (query.length > 1000) {
      return { allowed: false, reason: 'Query exceeds 1000 characters' }
    }

    if (WRITE_OPS.test(query)) {
      return { allowed: false, reason: 'Write operations (CREATE/MERGE/DELETE/SET/REMOVE/DROP) are not allowed' }
    }

    if (!HAS_RETURN.test(query)) {
      return { allowed: false, reason: 'Query must include RETURN' }
    }

    if (CALL_OPS.test(query)) {
      return { allowed: false, reason: 'CALL procedures are not allowed' }
    }

    if (APOC.test(query)) {
      return { allowed: false, reason: 'APOC procedures are not allowed' }
    }

    if (DBMS.test(query)) {
      return { allowed: false, reason: 'DBMS access is not allowed' }
    }

    if (LOAD_CSV.test(query)) {
      return { allowed: false, reason: 'LOAD CSV is not allowed' }
    }

    // Inject LIMIT 50 unless query uses aggregation or already has LIMIT
    const sanitizedQuery =
      !HAS_LIMIT.test(query) && !IS_AGGREGATION.test(query)
        ? `${query.trimEnd()} LIMIT 50`
        : query

    return { allowed: true, sanitizedQuery }
  }
}
