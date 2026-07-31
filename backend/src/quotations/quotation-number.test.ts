import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getCustomerInitials, formatQuotationNumber } from './quotation-number.service.js';
import { QuotationsService } from './quotations.service.js';
import { QuotationQueries } from './quotations.queries.js';
import { AuthenticatedUser } from '../middleware/auth.js';

jest.mock('../database/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ error: null })),
    })),
  },
}));

function createMockQueries() {
  const sequenceCounters: Record<number, number> = {};
  return {
    findAll: jest.fn<any>(),
    findById: jest.fn<any>(),
    create: jest.fn<any>().mockImplementation(async (input: any) => ({
      id: 'q-uuid-1',
      quotation_number: input.quotation_number,
      ...input,
    })),
    update: jest.fn<any>(),
    softDelete: jest.fn<any>(),
    findSpecValues: jest.fn<any>().mockResolvedValue([]),
    replaceSpecValues: jest.fn<any>().mockResolvedValue([]),
    findCustomItems: jest.fn<any>().mockResolvedValue([]),
    replaceCustomItems: jest.fn<any>().mockResolvedValue([]),
    findTemplateBasePrice: jest.fn<any>().mockResolvedValue(500000),
    findSpecPriceDiffs: jest.fn<any>().mockResolvedValue({}),
    findAppSettings: jest.fn<any>().mockResolvedValue({}),
    getNextSequenceForYear: jest.fn<any>().mockImplementation(async (year: number) => {
      sequenceCounters[year] = (sequenceCounters[year] || 0) + 1;
      return sequenceCounters[year];
    }),
  };
}

describe('Business-Friendly Quotation Numbering System', () => {
  let queries: ReturnType<typeof createMockQueries>;
  let service: QuotationsService;

  const actor: AuthenticatedUser = {
    id: 'actor-uuid-1',
    authId: 'auth-uuid-1',
    role: 'admin',
    email: 'admin@nexfra.in',
    name: 'Test Admin',
    employeeNumber: 'EMP-001',
  };

  beforeEach(() => {
    queries = createMockQueries();
    service = new QuotationsService(queries as unknown as QuotationQueries);
  });

  describe('Customer Initials Generation Rules', () => {
    it('1. Two-word names: "John Pork" -> JP', () => {
      expect(getCustomerInitials('John Pork')).toBe('JP');
    });

    it('1b. Two-word names: "Rajiv Kumar" -> RK', () => {
      expect(getCustomerInitials('Rajiv Kumar')).toBe('RK');
    });

    it('1c. Multi-word names: "ABC Logistics Corp" -> AL', () => {
      expect(getCustomerInitials('ABC Logistics Corp')).toBe('AL');
    });

    it('2. Single-word names: "John" -> JX', () => {
      expect(getCustomerInitials('John')).toBe('JX');
    });

    it('2b. Single-word names: "Mukesh" -> MX', () => {
      expect(getCustomerInitials('Mukesh')).toBe('MX');
    });

    it('3. Extra spaces & mixed casing: "   rajiv   kumar   " -> RK', () => {
      expect(getCustomerInitials('   rajiv   kumar   ')).toBe('RK');
    });

    it('4. Symbols & punctuation: "A&B, Corp!" -> AC', () => {
      expect(getCustomerInitials('A&B, Corp!')).toBe('AC');
    });

    it('4b. Space-separated symbols: "A B, Corp!" -> AB', () => {
      expect(getCustomerInitials('A B, Corp!')).toBe('AB');
    });

    it('4c. Symbols only: "@#$%^" -> XX', () => {
      expect(getCustomerInitials('@#$%^')).toBe('XX');
    });
  });

  describe('Full Quotation Number Formatting', () => {
    it('formats initials, year, and sequence', () => {
      expect(formatQuotationNumber('John Pork', 2026, 1)).toBe('JP/2026/000001');
      expect(formatQuotationNumber('John', 2026, 2)).toBe('JX/2026/000002');
      expect(formatQuotationNumber('Rajiv Kumar', 2026, 3)).toBe('RK/2026/000003');
      expect(formatQuotationNumber('ABC Logistics', 2026, 4)).toBe('AL/2026/000004');
    });
  });

  describe('QuotationsService Creation & Sequence Behavior', () => {
    it('creates quotation with business-friendly number format JP/2026/000001', async () => {
      const result = await service.create({ customerName: 'John Pork' }, actor);
      const currentYear = new Date().getFullYear();
      expect(result.quotationNumber).toBe(`JP/${currentYear}/000001`);
    });

    it('5. Concurrent generation: parallel creation produces distinct incrementing numbers', async () => {
      const currentYear = new Date().getFullYear();
      const promises = [
        service.create({ customerName: 'John Pork' }, actor),
        service.create({ customerName: 'Rajiv Kumar' }, actor),
        service.create({ customerName: 'Mukesh' }, actor),
      ];

      const results = await Promise.all(promises);
      const qNumbers = results.map((r) => r.quotationNumber);

      expect(qNumbers).toContain(`JP/${currentYear}/000001`);
      expect(qNumbers).toContain(`RK/${currentYear}/000002`);
      expect(qNumbers).toContain(`MX/${currentYear}/000003`);
      expect(new Set(qNumbers).size).toBe(3);
    });

    it('6. Year rollover: sequence for 2027 resets to 000001', async () => {
      const seq2026 = await queries.getNextSequenceForYear(2026);
      const seq2027 = await queries.getNextSequenceForYear(2027);

      expect(seq2026).toBe(1);
      expect(seq2027).toBe(1);
      expect(formatQuotationNumber('John Pork', 2026, seq2026)).toBe('JP/2026/000001');
      expect(formatQuotationNumber('John Pork', 2027, seq2027)).toBe('JP/2027/000001');
    });
  });
});
