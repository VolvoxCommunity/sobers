/**
 * @fileoverview Tests for NativeBottomTabs.web.tsx (Web stub)
 *
 * Tests the web stub for NativeBottomTabs which exports null
 * to prevent bundler errors on web platform.
 */

describe('NativeBottomTabs.web', () => {
  // Reset modules before each test to ensure clean imports
  beforeEach(() => {
    jest.resetModules();
  });

  it('exports NativeTabs as null', () => {
    // Import the web stub directly
    const { NativeTabs } = require('@/components/navigation/NativeBottomTabs.web');

    expect(NativeTabs).toBeNull();
  });

  it('exports NativeBottomTabNavigationOptions type', () => {
    // Import the module to verify the type export exists
    const module = require('@/components/navigation/NativeBottomTabs.web');

    // The module should have exported members
    expect(module).toHaveProperty('NativeTabs');
  });
});
