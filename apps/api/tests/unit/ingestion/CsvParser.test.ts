import { describe, it, expect } from 'vitest'
import { CsvParser } from '../../../src/infrastructure/ingestion/CsvParser.js'

const LOCATION_CSV = `name;short_description;full_description;services;honors;npcs
casa_de_banho;para cura descanso e recuperacao;Ampla construcao de pedra.;Seus PV maximos aumentam em +5.;Uma vez por dia obtem resultado maximo.;Aaliyah
arena;para aquisicao de poderes de combate;Anfiteatro de combate.;Combate e apostas.;Voce recebe um poder de combate.;Caliandre|Juno|Martin
`

const NPC_CSV = `name;description;location;likes;dislikes;benefits_cordial;benefits_loyal;benefits_intimate;last_demand
Aaliyah;Bela moreau do gato.;Casa de Banho;Cafune na cabeca|trico|perfumes;Coisas fedorentas|barulho;+2 Percepcao.;Ignora penalidades.;Usa honraria adicional.;Missao de escolta.
Caliandre;Aggelus com halo luminoso.;Arena;Armas exoticas|combate|duelos;Magia arcana|passividade;+5 em manobra.;Poder aprimorado.;Parceira combatente.;Recuperar arma especifica.
`

describe('CsvParser', () => {
  describe('parseLocations', () => {
    it('parses location name and short_description', () => {
      const locations = CsvParser.parseLocations(LOCATION_CSV)
      expect(locations).toHaveLength(2)
      expect(locations[0]!.name).toBe('casa_de_banho')
      expect(locations[0]!.short_description).toBe('para cura descanso e recuperacao')
    })

    it('splits pipe-separated NPC names into array', () => {
      const locations = CsvParser.parseLocations(LOCATION_CSV)
      const arena = locations.find((l) => l.name === 'arena')
      expect(arena?.npcs).toEqual(['Caliandre', 'Juno', 'Martin'])
    })

    it('handles single NPC without pipe', () => {
      const locations = CsvParser.parseLocations(LOCATION_CSV)
      const banho = locations.find((l) => l.name === 'casa_de_banho')
      expect(banho?.npcs).toEqual(['Aaliyah'])
    })
  })

  describe('parseNpcs', () => {
    it('parses NPC name and description', () => {
      const npcs = CsvParser.parseNpcs(NPC_CSV)
      expect(npcs).toHaveLength(2)
      expect(npcs[0]!.name).toBe('Aaliyah')
      expect(npcs[0]!.location).toBe('Casa de Banho')
    })

    it('splits pipe-separated likes into array', () => {
      const npcs = CsvParser.parseNpcs(NPC_CSV)
      expect(npcs[0]!.likes).toEqual(['Cafune na cabeca', 'trico', 'perfumes'])
    })

    it('preserves all benefit tiers', () => {
      const npcs = CsvParser.parseNpcs(NPC_CSV)
      const aaliyah = npcs[0]!
      expect(aaliyah.benefits_cordial).toBeTruthy()
      expect(aaliyah.benefits_loyal).toBeTruthy()
      expect(aaliyah.benefits_intimate).toBeTruthy()
    })

    it('NPC location uses display name (not slug)', () => {
      const npcs = CsvParser.parseNpcs(NPC_CSV)
      expect(npcs[0]!.location).toBe('Casa de Banho')
      expect(npcs[1]!.location).toBe('Arena')
    })
  })
})
