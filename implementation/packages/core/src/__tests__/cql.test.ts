import { describe, it, expect } from 'vitest';
import { parseCQL } from '../cql.js';

describe('parseCQL', () => {
  describe('basic queries', () => {
    it('parses SELECT * FROM contexts', () => {
      const result = parseCQL("SELECT * FROM contexts WHERE lifecycle = 'active'");
      expect(result.conditions.length).toBe(1);
      expect(result.conditions[0]).toEqual({
        field: 'lifecycle',
        op: '=',
        value: 'active',
      });
    });

    it('select is optional', () => {
      const result = parseCQL("FROM contexts WHERE lifecycle = 'active'");
      expect(result.conditions.length).toBe(1);
    });

    it('parses string value with single quotes', () => {
      const result = parseCQL("SELECT * FROM contexts WHERE category = 'security'");
      expect(result.conditions[0]).toEqual({
        field: 'category',
        op: '=',
        value: 'security',
      });
    });

    it('parses numeric value', () => {
      const result = parseCQL("SELECT * FROM contexts WHERE authority.level >= 3");
      expect(result.conditions[0]).toEqual({
        field: 'authority.level',
        op: '>=',
        value: 3,
      });
    });
  });

  describe('operators', () => {
    it('parses > and <', () => {
      const r1 = parseCQL("SELECT * FROM contexts WHERE version > 1");
      expect(r1.conditions[0].op).toBe('>');

      const r2 = parseCQL("SELECT * FROM contexts WHERE version <= 5");
      expect(r2.conditions[0].op).toBe('<=');
    });

    it('parses !=', () => {
      const result = parseCQL("SELECT * FROM contexts WHERE lifecycle != 'archived'");
      expect(result.conditions[0].op).toBe('!=');
    });

    it('parses IN', () => {
      const result = parseCQL("SELECT * FROM contexts WHERE lifecycle IN ('active', 'deprecated')");
      expect(result.conditions[0].op).toBe('IN');
      expect(result.conditions[0].value).toEqual(['active', 'deprecated']);
    });

    it('parses NOT IN', () => {
      const result = parseCQL("SELECT * FROM contexts WHERE lifecycle NOT IN ('archived', 'draft')");
      expect(result.conditions[0].op).toBe('NOT IN');
      expect(result.conditions[0].value).toEqual(['archived', 'draft']);
    });

    it('parses CONTAINS', () => {
      const result = parseCQL("SELECT * FROM contexts WHERE tags CONTAINS 'security'");
      expect(result.conditions[0].op).toBe('CONTAINS');
      expect(result.conditions[0].value).toBe('security');
    });

    it('parses IS NULL', () => {
      const result = parseCQL("SELECT * FROM contexts WHERE deprecated_date IS NULL");
      expect(result.conditions[0].op).toBe('IS NULL');
      expect(result.conditions[0].value).toBeNull();
    });

    it('parses IS NOT NULL', () => {
      const result = parseCQL("SELECT * FROM contexts WHERE effective_date IS NOT NULL");
      expect(result.conditions[0].op).toBe('IS NOT NULL');
    });

    it('parses GLOB', () => {
      const result = parseCQL("SELECT * FROM contexts WHERE applies_to GLOB 'api/**'");
      expect(result.conditions[0].op).toBe('GLOB');
    });

    it('parses LIKE', () => {
      const result = parseCQL("SELECT * FROM contexts WHERE title LIKE '%security%'");
      expect(result.conditions[0].op).toBe('LIKE');
    });
  });

  describe('multiple conditions', () => {
    it('parses AND conditions', () => {
      const result = parseCQL("SELECT * FROM contexts WHERE lifecycle = 'active' AND category = 'security'");
      expect(result.conditions.length).toBe(2);
      expect(result.conditions[0].field).toBe('lifecycle');
      expect(result.conditions[1].field).toBe('category');
    });

    it('parses three AND conditions', () => {
      const result = parseCQL(
        "SELECT * FROM contexts WHERE lifecycle = 'active' AND category = 'security' AND authority.level >= 3"
      );
      expect(result.conditions.length).toBe(3);
    });
  });

  describe('ordering', () => {
    it('parses ORDER BY single field', () => {
      const result = parseCQL("SELECT * FROM contexts ORDER BY severity");
      expect(result.order_by).toHaveLength(1);
      expect(result.order_by![0]).toEqual({ field: 'severity', desc: false });
    });

    it('parses ORDER BY DESC', () => {
      const result = parseCQL("SELECT * FROM contexts ORDER BY updated_at DESC");
      expect(result.order_by![0]).toEqual({ field: 'updated_at', desc: true });
    });

    it('parses ORDER BY ASC', () => {
      const result = parseCQL("SELECT * FROM contexts ORDER BY version ASC");
      expect(result.order_by![0]).toEqual({ field: 'version', desc: false });
    });
  });

  describe('limits', () => {
    it('parses LIMIT', () => {
      const result = parseCQL("SELECT * FROM contexts LIMIT 10");
      expect(result.limit).toBe(10);
    });

    it('parses OFFSET', () => {
      const result = parseCQL("SELECT * FROM contexts OFFSET 20");
      expect(result.offset).toBe(20);
    });

    it('parses LIMIT and OFFSET together', () => {
      const result = parseCQL("SELECT * FROM contexts LIMIT 50 OFFSET 100");
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(100);
    });
  });

  describe('select fields', () => {
    it('parses specific fields', () => {
      const result = parseCQL("SELECT id, title, lifecycle FROM contexts WHERE lifecycle = 'active'");
      expect(result.select).toEqual(['id', 'title', 'lifecycle']);
    });
  });
});
