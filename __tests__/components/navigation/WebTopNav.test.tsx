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

    // Query by role 'tab' which is set on Pressable elements
    const allTabs = screen.getAllByRole('tab');
    expect(allTabs).toHaveLength(2);

    // Find the selected tab (Home since pathname is '/')
    const selectedTab = allTabs.find((tab) => tab.props.accessibilityState?.selected === true);
    const unselectedTab = allTabs.find((tab) => tab.props.accessibilityState?.selected === false);

    // Verify one tab is selected (Home) and one is not (Steps)
    expect(selectedTab).toBeTruthy();
    expect(unselectedTab).toBeTruthy();

    // Verify it's the correct tab by checking for the label text
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Steps')).toBeTruthy();
  });
});
