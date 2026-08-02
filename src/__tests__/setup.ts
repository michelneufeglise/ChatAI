import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri APIs that don't exist in jsdom
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));
