import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/test-utils';
import WebTopNav from '@/components/navigation/WebTopNav';
import { Home, BookOpen } from 'lucide-react-native';

const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  usePathname: () => '/',
}));

jest.mock('lucide-react-native', () => ({
  Home: () => null,
  BookOpen: () => null,
}));

describe('WebTopNav', () => {
  const items = [
    { route: '/', label: 'Home', icon: Home },
    { route: '/steps', label: 'Steps', icon: BookOpen },
  ];

  beforeEach(() => {
    mockRouterPush.mockClear();
  });

  it('renders all navigation items', () => {
    renderWithProviders(<WebTopNav items={items} />);
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Steps')).toBeTruthy();
  });

  it('navigates when item is pressed', () => {
    renderWithProviders(<WebTopNav items={items} />);
    fireEvent.press(screen.getByText('Steps'));
    expect(mockRouterPush).toHaveBeenCalledWith('/steps');
  });

  it('highlights active route with selected accessibility state', () => {
    renderWithProviders(<WebTopNav items={items} />);
    // Get text elements and navigate to their parent pressables to check accessibility state
    const homeText = screen.getByText('Home');
    const stepsText = screen.getByText('Steps');

    // Get parent elements (Pressables) which have the accessibility props
    // In the component, each Pressable wraps an icon and text with accessibilityState
    const homeParent = homeText.parent?.parent; // Text -> View -> Pressable
    const stepsParent = stepsText.parent?.parent;

    // Home is active (pathname is '/'), Steps is not
    expect(homeParent?.props.accessibilityState?.selected).toBe(true);
    expect(stepsParent?.props.accessibilityState?.selected).toBe(false);
  });
});
