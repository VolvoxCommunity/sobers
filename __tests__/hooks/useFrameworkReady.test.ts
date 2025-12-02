/**
 * Tests for useFrameworkReady hook
 */

import { renderHook } from '@testing-library/react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

// Mock window object for node environment
const mockWindow = {} as { frameworkReady?: () => void };
(global as any).window = mockWindow;

describe('useFrameworkReady', () => {
  beforeEach(() => {
    // Reset window.frameworkReady before each test
    delete mockWindow.frameworkReady;
  });

  afterEach(() => {
    // Clean up after each test
    delete mockWindow.frameworkReady;
  });

  it('should call window.frameworkReady when it exists', () => {
    const mockFrameworkReady = jest.fn();
    mockWindow.frameworkReady = mockFrameworkReady;

    renderHook(() => useFrameworkReady());

    expect(mockFrameworkReady).toHaveBeenCalledTimes(1);
  });

  it('should not throw when window.frameworkReady does not exist', () => {
    // Ensure frameworkReady is undefined
    expect(mockWindow.frameworkReady).toBeUndefined();

    // Should not throw
    expect(() => {
      renderHook(() => useFrameworkReady());
    }).not.toThrow();
  });

  it('should call frameworkReady on every render when no dependency array', () => {
    const mockFrameworkReady = jest.fn();
    mockWindow.frameworkReady = mockFrameworkReady;

    const { rerender } = renderHook(() => useFrameworkReady());

    // First render
    expect(mockFrameworkReady).toHaveBeenCalledTimes(1);

    // Re-render
    rerender({});
    expect(mockFrameworkReady).toHaveBeenCalledTimes(2);

    // Another re-render
    rerender({});
    expect(mockFrameworkReady).toHaveBeenCalledTimes(3);
  });

  it('should handle frameworkReady being set after initial render', () => {
    // Start without frameworkReady
    const { rerender } = renderHook(() => useFrameworkReady());

    // Now set frameworkReady
    const mockFrameworkReady = jest.fn();
    mockWindow.frameworkReady = mockFrameworkReady;

    // Re-render should call the newly set function
    rerender({});
    expect(mockFrameworkReady).toHaveBeenCalledTimes(1);
  });

  it('should use optional chaining safely', () => {
    // Set frameworkReady to null (not undefined)
    (mockWindow as any).frameworkReady = null;

    // Should not throw
    expect(() => {
      renderHook(() => useFrameworkReady());
    }).not.toThrow();
  });
});
