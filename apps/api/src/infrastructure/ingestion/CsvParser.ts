export interface RawLocation {
  name: string
  short_description: string
  full_description: string
  services: string
  honors: string
  npcs: string[]
}

export interface RawNpc {
  name: string
  description: string
  location: string
  likes: string[]
  dislikes: string[]
  benefits_cordial: string
  benefits_loyal: string
  benefits_intimate: string
  last_demand: string
}

function splitPipe(value: string): string[] {
  return value
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function parseRows(csvContent: string): string[][] {
  const lines = csvContent
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)

  return lines.map((line) => line.split(';'))
}

export class CsvParser {
  static parseLocations(csvContent: string): RawLocation[] {
    const rows = parseRows(csvContent)
    // Skip header row
    const [, ...dataRows] = rows

    return dataRows
      .filter((cols) => cols.length >= 6 && cols[0]!.trim().length > 0)
      .map((cols) => ({
        name: cols[0]!.trim(),
        short_description: cols[1]!.trim(),
        full_description: cols[2]!.trim(),
        services: cols[3]!.trim(),
        honors: cols[4]!.trim(),
        npcs: splitPipe(cols[5]!.trim()),
      }))
  }

  static parseNpcs(csvContent: string): RawNpc[] {
    const rows = parseRows(csvContent)
    const [, ...dataRows] = rows

    return dataRows
      .filter((cols) => cols.length >= 9 && cols[0]!.trim().length > 0)
      .map((cols) => ({
        name: cols[0]!.trim(),
        description: cols[1]!.trim(),
        location: cols[2]!.trim(),
        likes: splitPipe(cols[3]!.trim()),
        dislikes: splitPipe(cols[4]!.trim()),
        benefits_cordial: cols[5]!.trim(),
        benefits_loyal: cols[6]!.trim(),
        benefits_intimate: cols[7]!.trim(),
        last_demand: cols[8]!.trim(),
      }))
  }
}
