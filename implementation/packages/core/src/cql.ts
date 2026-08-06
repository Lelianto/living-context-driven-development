import type { RegistryQuery, QueryCondition } from './types.js';

interface Token {
  type: 'SELECT' | 'FROM' | 'WHERE' | 'ORDER' | 'BY' | 'LIMIT' | 'OFFSET' | 'ASC' | 'DESC' |
        'AND' | 'OR' | 'IN' | 'NOT' | 'NULL' | 'BETWEEN' | 'LIKE' | 'GLOB' | 'CONTAINS' |
        'CONTAINS_ANY' | 'CONTAINS_ALL' | 'IS' | 'STAR' | 'COMMA' | 'LPAREN' | 'RPAREN' |
        'IDENTIFIER' | 'STRING' | 'NUMBER' | 'DOT' | 'EQUALS' | 'NOT_EQUALS' | 'LT' | 'LTE' |
        'GT' | 'GTE' | 'EOF';
  value?: string;
}

const KEYWORDS: Record<string, Token['type']> = {
  'SELECT': 'SELECT', 'FROM': 'FROM', 'WHERE': 'WHERE', 'ORDER': 'ORDER',
  'BY': 'BY', 'LIMIT': 'LIMIT', 'OFFSET': 'OFFSET', 'ASC': 'ASC', 'DESC': 'DESC',
  'AND': 'AND', 'OR': 'OR', 'IN': 'IN', 'NOT': 'NOT', 'NULL': 'NULL',
  'BETWEEN': 'BETWEEN', 'LIKE': 'LIKE', 'GLOB': 'GLOB',
  'CONTAINS': 'CONTAINS', 'CONTAINS_ANY': 'CONTAINS_ANY', 'CONTAINS_ALL': 'CONTAINS_ALL',
  'IS': 'IS',
};

class Lexer {
  private pos = 0;
  private input: string;

  constructor(input: string) {
    this.input = input;
  }

  private peek(): string {
    return this.pos < this.input.length ? this.input[this.pos] : '\0';
  }

  private advance(): string {
    return this.input[this.pos++] || '\0';
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.peek())) {
      this.advance();
    }
  }

  private readString(quote: string): string {
    let result = '';
    this.advance();
    while (this.pos < this.input.length && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance();
        if (this.peek() === quote) result += quote;
        else result += '\\' + this.peek();
      } else {
        result += this.peek();
      }
      this.advance();
    }
    if (this.pos < this.input.length) this.advance();
    return result;
  }

  private readIdentifierOrKeyword(): Token {
    let text = '';
    while (this.pos < this.input.length && /[\w.*_-]/.test(this.peek())) {
      text += this.advance();
    }
    const upper = text.toUpperCase();
    if (KEYWORDS[upper]) {
      return { type: KEYWORDS[upper], value: text };
    }
    return { type: 'IDENTIFIER', value: text };
  }

  nextToken(): Token {
    this.skipWhitespace();

    if (this.pos >= this.input.length) return { type: 'EOF' };

    const ch = this.peek();

    if (ch === "'" || ch === '"') {
      return { type: 'STRING', value: this.readString(ch) };
    }

    if (ch === '*') { this.advance(); return { type: 'STAR' }; }
    if (ch === ',') { this.advance(); return { type: 'COMMA' }; }
    if (ch === '(') { this.advance(); return { type: 'LPAREN' }; }
    if (ch === ')') { this.advance(); return { type: 'RPAREN' }; }
    if (ch === '.') { this.advance(); return { type: 'DOT' }; }

    if (ch === '!') {
      this.advance();
      if (this.peek() === '=') { this.advance(); return { type: 'NOT_EQUALS' }; }
      return { type: 'NOT' };
    }

    if (ch === '=') { this.advance(); return { type: 'EQUALS' }; }
    if (ch === '<') {
      this.advance();
      if (this.peek() === '=') { this.advance(); return { type: 'LTE' }; }
      return { type: 'LT' };
    }
    if (ch === '>') {
      this.advance();
      if (this.peek() === '=') { this.advance(); return { type: 'GTE' }; }
      return { type: 'GT' };
    }

    if (/\d/.test(ch)) {
      let num = '';
      while (this.pos < this.input.length && /[\d.]/.test(this.peek())) {
        num += this.advance();
      }
      return { type: 'NUMBER', value: num };
    }

    if (/[a-zA-Z_]/.test(ch)) {
      return this.readIdentifierOrKeyword();
    }

    this.advance();
    return this.nextToken();
  }
}

class CQLParser {
  private tokens: Token[] = [];
  private pos = 0;

  parse(input: string): RegistryQuery {
    const lexer = new Lexer(input);
    let token: Token;
    while ((token = lexer.nextToken()).type !== 'EOF') {
      this.tokens.push(token);
    }
    this.tokens.push({ type: 'EOF' });
    return this.parseQuery();
  }

  private current(): Token {
    return this.tokens[this.pos] || { type: 'EOF' };
  }

  private advance(): Token {
    const token = this.current();
    this.pos++;
    return token;
  }

  private expect(type: Token['type']): Token {
    const token = this.advance();
    if (token.type !== type) {
      throw new Error(`Expected ${type}, got ${token.type} (${token.value || ''})`);
    }
    return token;
  }

  private parseQuery(): RegistryQuery {
    const result: RegistryQuery = { conditions: [] };

    if (this.current().type === 'SELECT') {
      this.advance();
      this.parseSelectList(result);
    }

    if (this.current().type === 'FROM') {
      this.advance();
      this.expect('IDENTIFIER');
    }

    if (this.current().type === 'WHERE') {
      this.advance();
      result.conditions = this.parseConditions();
    }

    if (this.current().type === 'ORDER') {
      this.advance();
      this.expect('BY');
      result.order_by = this.parseOrderBy();
    }

    if (this.current().type === 'LIMIT') {
      this.advance();
      const token = this.expect('NUMBER');
      result.limit = parseInt(token.value || '50', 10);
    }

    if (this.current().type === 'OFFSET') {
      this.advance();
      const token = this.expect('NUMBER');
      result.offset = parseInt(token.value || '0', 10);
    }

    return result;
  }

  private parseSelectList(result: RegistryQuery): void {
    if (this.current().type === 'STAR') {
      this.advance();
      return;
    }

    result.select = [];
    while (true) {
      const token = this.expect('IDENTIFIER');
      result.select.push(token.value || '');
      if (this.current().type !== 'COMMA') break;
      this.advance();
    }
  }

  private parseConditions(): QueryCondition[] {
    const conditions: QueryCondition[] = [];
    do {
      conditions.push(this.parseCondition());
    } while (this.current().type === 'AND' && this.advance());
    return conditions;
  }

  private parseCondition(): QueryCondition {
    if (this.current().type === 'LPAREN') {
      this.advance();
      const conditions = this.parseConditions();
      this.expect('RPAREN');
      return conditions[0];
    }

    let field = '';
    while (this.current().type === 'IDENTIFIER' || this.current().type === 'DOT') {
      field += this.advance().value || '';
    }

    const token = this.current();
    const opMap: Record<string, string> = {
      'EQUALS': '=', 'NOT_EQUALS': '!=', 'LT': '<', 'LTE': '<=',
      'GT': '>', 'GTE': '>=', 'LIKE': 'LIKE', 'GLOB': 'GLOB',
    };

    if (this.current().type === 'IS') {
      this.advance();
      if (this.current().type === 'NOT') {
        this.advance();
        this.expect('NULL');
        return { field, op: 'IS NOT NULL', value: null };
      }
      this.expect('NULL');
      return { field, op: 'IS NULL', value: null };
    }

    if (this.current().type === 'IN') {
      this.advance();
      this.expect('LPAREN');
      const values: string[] = [];
      while (true) {
        values.push(this.expect('STRING').value || '');
        if (this.current().type !== 'COMMA') break;
        this.advance();
      }
      this.expect('RPAREN');
      return { field, op: 'IN', value: values };
    }

    if (this.current().type === 'NOT') {
      this.advance();
      this.expect('IN');
      this.expect('LPAREN');
      const values: string[] = [];
      while (true) {
        values.push(this.expect('STRING').value || '');
        if (this.current().type !== 'COMMA') break;
        this.advance();
      }
      this.expect('RPAREN');
      return { field, op: 'NOT IN', value: values };
    }

    if (this.current().type === 'CONTAINS') {
      this.advance();
      return { field, op: 'CONTAINS', value: this.expect('STRING').value || '' };
    }

    if (this.current().type === 'CONTAINS_ANY') {
      this.advance();
      this.expect('LPAREN');
      const values: string[] = [];
      while (true) {
        values.push(this.expect('STRING').value || '');
        if (this.current().type !== 'COMMA') break;
        this.advance();
      }
      this.expect('RPAREN');
      return { field, op: 'CONTAINS_ANY', value: values };
    }

    if (this.current().type === 'CONTAINS_ALL') {
      this.advance();
      this.expect('LPAREN');
      const values: string[] = [];
      while (true) {
        values.push(this.expect('STRING').value || '');
        if (this.current().type !== 'COMMA') break;
        this.advance();
      }
      this.expect('RPAREN');
      return { field, op: 'CONTAINS_ALL', value: values };
    }

    if (opMap[token.type]) {
      this.advance();
      const next = this.current();
      const value = next.type === 'STRING' ? next.value :
                    next.type === 'NUMBER' ? parseFloat(next.value || '0') :
                    next.value;
      this.advance();
      return { field, op: opMap[token.type] as QueryCondition['op'], value };
    }

    throw new Error(`Unexpected token in condition: ${token.type} (${token.value || ''})`);
  }

  private parseOrderBy(): { field: string; desc?: boolean }[] {
    const orders: { field: string; desc?: boolean }[] = [];
    while (true) {
      const field = this.expect('IDENTIFIER').value || '';
      const desc = this.current().type === 'DESC';
      if (desc) this.advance();
      else if (this.current().type === 'ASC') this.advance();
      orders.push({ field, desc });
      if (this.current().type !== 'COMMA') break;
      this.advance();
    }
    return orders;
  }
}

export function parseCQL(input: string): RegistryQuery {
  const parser = new CQLParser();
  return parser.parse(input);
}
