export class InputSanitizer {
  static sanitize(input: string, maxLength = 2000): string {
    // 1. Remove null bytes e chars de controle (exceto \n, \t, \r)
    let result = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

    // 2. Normaliza unicode NFKC
    result = result.normalize('NFKC')

    // 3. Trunca ao maxLength
    result = result.slice(0, maxLength)

    // 4. Normaliza whitespace excessivo (máx 3 newlines consecutivas)
    result = result.replace(/\n{4,}/g, '\n\n\n')

    // 5. Trim
    return result.trim()
  }
}
