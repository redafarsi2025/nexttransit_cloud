import { describe, it, expect, beforeEach } from 'vitest';
import { supabaseMock, setMockData, setMockError, setMockEmpty, resetSupabaseMock } from './supabaseMock';

describe('Supabase Mock Infrastructure', () => {
  beforeEach(() => {
    resetSupabaseMock();
  });

  it('A. Query chain: from → select → eq → single', async () => {
    setMockData({ id: '123' });
    const result = await supabaseMock.from('table').select('*').eq('id', '123').single();
    expect(result.data).toEqual({ id: '123' });
    expect(result.error).toBeNull();
  });

  it('B. Query chain sans single: from → select → eq → await', async () => {
    setMockData({ id: '123' });
    const result = await supabaseMock.from('table').select('*').eq('id', '123');
    expect(result.data).toEqual([{ id: '123' }]); // Resolves to array
    expect(result.error).toBeNull();
  });

  it('C. Insert: from → insert → await', async () => {
    setMockData({ id: 'new-id' });
    const result = await supabaseMock.from('table').insert([{ id: 'new-id' }]);
    expect(result.data).toEqual([{ id: 'new-id' }]);
    expect(result.error).toBeNull();
  });

  it('D. Update: from → update → eq → await', async () => {
    setMockData({ id: 'updated' });
    const result = await supabaseMock.from('table').update({ val: 1 }).eq('id', '123');
    expect(result.data).toEqual([{ id: 'updated' }]);
    expect(result.error).toBeNull();
  });

  it('E. maybeSingle: absence de résultat', async () => {
    setMockEmpty();
    const result = await supabaseMock.from('table').select('*').eq('id', 'missing').maybeSingle();
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('F. erreur DB: { data: null, error: mockError }', async () => {
    setMockError(new Error('PostgreSQL Error'));
    const result = await supabaseMock.from('table').select('*').single();
    expect(result.data).toBeNull();
    expect(result.error).toEqual(new Error('PostgreSQL Error'));
  });

  it('G. isolation: le comportement configuré ne doit pas contaminer', async () => {
    // Already set in beforeEach via resetSupabaseMock
    const result = await supabaseMock.from('table').select('*').single();
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });
});
