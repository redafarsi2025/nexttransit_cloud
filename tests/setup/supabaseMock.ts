import { vi } from 'vitest';

export type MockState = {
  data: any | null;
  error: any | null;
};

// Global state for the mock
let mockState: MockState = {
  data: null,
  error: null,
};

export const setMockData = (data: any) => {
  mockState.data = data;
  mockState.error = null;
};

export const setMockError = (error: any) => {
  mockState.error = error;
  mockState.data = null;
};

export const setMockEmpty = () => {
  mockState.data = null;
  mockState.error = null;
};

export const resetSupabaseMock = () => {
  mockState = { data: null, error: null };
};

// The core query builder that returns itself for chaining
export const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),

  // Terminal methods that resolve immediately based on mockState
  single: vi.fn().mockImplementation(async () => {
    return { data: mockState.data, error: mockState.error };
  }),
  maybeSingle: vi.fn().mockImplementation(async () => {
    return { data: mockState.data, error: mockState.error };
  }),

  // Thenable support for direct `await supabase.from(...)`
  then: vi.fn(function (resolve) {
    resolve({ data: mockState.data ? [mockState.data] : [], error: mockState.error });
  }),
};

// The main mock function to be used in vi.mock
export const createSupabaseMock = () => {
  return {
    from: vi.fn((_table?: string) => mockQueryBuilder),
    rpc: vi.fn().mockImplementation(async () => {
      return { data: mockState.data, error: mockState.error };
    }),
    auth: {
      getUser: vi.fn().mockImplementation(async () => {
        return { data: mockState.data, error: mockState.error };
      }),
      signInWithPassword: vi.fn().mockImplementation(async () => {
        return { data: mockState.data, error: mockState.error };
      }),
      signUp: vi.fn().mockImplementation(async () => {
        return { data: mockState.data, error: mockState.error };
      }),
    }
  };
};

export const supabaseMock = createSupabaseMock();
