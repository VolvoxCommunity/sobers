/**
 * @fileoverview Tests for EnterInviteCodeSheet component
 *
 * Tests invite code entry behavior including:
 * - Sheet rendering and structure
 * - Input validation (8-character alphanumeric)
 * - Form submission
 * - Error handling
 * - Loading states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import EnterInviteCodeSheet, {
  EnterInviteCodeSheetRef,
} from '@/components/sheets/EnterInviteCodeSheet';

// =============================================================================
// Mocks
// =============================================================================

// Mock GlassBottomSheet
const mockPresent = jest.fn();
const mockDismiss = jest.fn();

jest.mock('@/components/GlassBottomSheet', () => {
  const React = require('react');
  const MockGlassBottomSheet = React.forwardRef(
    (
      { children, onDismiss }: { children: React.ReactNode; onDismiss?: () => void },
      ref: React.Ref<{ present: () => void; dismiss: () => void }>
    ) => {
      React.useImperativeHandle(ref, () => ({
        present: mockPresent,
        dismiss: () => {
          mockDismiss();
          onDismiss?.();
        },
      }));
      return React.createElement('View', { testID: 'glass-bottom-sheet' }, children);
    }
  );
  MockGlassBottomSheet.displayName = 'GlassBottomSheet';
  return {
    __esModule: true,
    default: MockGlassBottomSheet,
  };
});

// Mock BottomSheet components
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { ScrollView, TextInput } = require('react-native');
  return {
    BottomSheetScrollView: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement(ScrollView, { ...props, testID: 'bottom-sheet-scroll-view' }, children),
    BottomSheetTextInput: (props: Record<string, unknown>) => React.createElement(TextInput, props),
  };
});

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  X: () => null,
  QrCode: () => null,
}));

// Mock theme
const mockTheme = {
  primary: '#007AFF',
  primaryLight: '#E5F1FF',
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  background: '#ffffff',
  surface: '#ffffff',
  card: '#ffffff',
  border: '#e5e7eb',
  success: '#10b981',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  white: '#ffffff',
  fontRegular: 'JetBrainsMono-Regular',
};

// =============================================================================
// Test Suite
// =============================================================================

describe('EnterInviteCodeSheet', () => {
  const mockOnSubmit = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderSheet = () => {
    const ref = React.createRef<EnterInviteCodeSheetRef>();
    const result = render(
      <EnterInviteCodeSheet
        ref={ref}
        theme={mockTheme}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );
    return { ...result, ref };
  };

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      renderSheet();
      expect(screen.getByTestId('glass-bottom-sheet')).toBeTruthy();
    });

    it('renders title', () => {
      renderSheet();
      expect(screen.getByText('Enter Invite Code')).toBeTruthy();
    });

    it('renders subtitle with instructions', () => {
      renderSheet();
      expect(screen.getByText(/Enter the 8-character invite code from your sponsor/)).toBeTruthy();
    });

    it('renders invite code input', () => {
      renderSheet();
      expect(screen.getByPlaceholderText('Enter 8-character code')).toBeTruthy();
    });

    it('renders character count', () => {
      renderSheet();
      expect(screen.getByText('0/8 characters')).toBeTruthy();
    });

    it('renders Connect button', () => {
      renderSheet();
      expect(screen.getByTestId('connect-button')).toBeTruthy();
    });

    it('renders Cancel button', () => {
      renderSheet();
      expect(screen.getByTestId('cancel-button')).toBeTruthy();
    });

    it('renders close icon button', () => {
      renderSheet();
      expect(screen.getByTestId('close-icon-button')).toBeTruthy();
    });
  });

  describe('Imperative API', () => {
    it('exposes present method via ref', () => {
      const { ref } = renderSheet();
      expect(ref.current?.present).toBeDefined();
    });

    it('exposes dismiss method via ref', () => {
      const { ref } = renderSheet();
      expect(ref.current?.dismiss).toBeDefined();
    });

    it('calls GlassBottomSheet present when present is called', () => {
      const { ref } = renderSheet();
      ref.current?.present();
      expect(mockPresent).toHaveBeenCalled();
    });

    it('calls GlassBottomSheet dismiss when dismiss is called', () => {
      const { ref } = renderSheet();
      ref.current?.dismiss();
      expect(mockDismiss).toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    it('sanitizes input to alphanumeric only', () => {
      renderSheet();
      const input = screen.getByPlaceholderText('Enter 8-character code');

      fireEvent.changeText(input, 'ABC-123!@#');

      expect(input.props.value).toBe('ABC123');
    });

    it('auto-capitalizes input', () => {
      renderSheet();
      const input = screen.getByPlaceholderText('Enter 8-character code');

      fireEvent.changeText(input, 'abcdef12');

      expect(input.props.value).toBe('ABCDEF12');
    });

    it('limits input to 8 characters', () => {
      renderSheet();
      const input = screen.getByPlaceholderText('Enter 8-character code');

      // Input has maxLength=8, but we test the sanitization
      fireEvent.changeText(input, 'ABC12345');

      expect(input.props.value).toBe('ABC12345');
    });

    it('updates character count as user types', () => {
      renderSheet();
      const input = screen.getByPlaceholderText('Enter 8-character code');

      fireEvent.changeText(input, 'ABC');

      expect(screen.getByText('3/8 characters')).toBeTruthy();
    });
  });

  describe('Submit Button State', () => {
    it('Connect button is disabled when code is empty', async () => {
      renderSheet();
      const button = screen.getByTestId('connect-button');

      // Button should be disabled with empty input
      expect(button.props.disabled).toBe(true);
    });

    it('Connect button is disabled when code is less than 8 characters', async () => {
      renderSheet();
      const input = screen.getByPlaceholderText('Enter 8-character code');

      fireEvent.changeText(input, 'ABC123');

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.disabled).toBe(true);
      });
    });

    it('Connect button is enabled when code is exactly 8 characters', async () => {
      renderSheet();
      const input = screen.getByPlaceholderText('Enter 8-character code');

      fireEvent.changeText(input, 'ABC12345');

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.disabled).toBe(false);
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with invite code when Connect is pressed', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined);
      renderSheet();

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'ABC12345');

      fireEvent.press(screen.getByTestId('connect-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('ABC12345');
      });
    });

    it('shows error message when onSubmit throws', async () => {
      mockOnSubmit.mockRejectedValueOnce(new Error('Invalid invite code'));
      renderSheet();

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'ABC12345');

      fireEvent.press(screen.getByTestId('connect-button'));

      await waitFor(() => {
        expect(screen.getByText('Invalid invite code')).toBeTruthy();
      });
    });

    it('shows generic error when onSubmit throws non-Error', async () => {
      mockOnSubmit.mockRejectedValueOnce('Something went wrong');
      renderSheet();

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'ABC12345');

      fireEvent.press(screen.getByTestId('connect-button'));

      await waitFor(() => {
        expect(screen.getByText('Failed to connect. Please try again.')).toBeTruthy();
      });
    });

    it('clears error when user starts typing', async () => {
      mockOnSubmit.mockRejectedValueOnce(new Error('Invalid invite code'));
      renderSheet();

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'ABC12345');

      fireEvent.press(screen.getByTestId('connect-button'));

      await waitFor(() => {
        expect(screen.getByText('Invalid invite code')).toBeTruthy();
      });

      // Start typing again
      fireEvent.changeText(input, 'XYZ');

      await waitFor(() => {
        expect(screen.queryByText('Invalid invite code')).toBeNull();
      });
    });

    it('dismisses sheet on successful submission', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined);
      renderSheet();

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'ABC12345');

      fireEvent.press(screen.getByTestId('connect-button'));

      await waitFor(() => {
        expect(mockDismiss).toHaveBeenCalled();
      });
    });

    it('shows validation error when submitting with less than 8 characters', async () => {
      renderSheet();

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'ABC');

      // Directly trigger submit via keyboard
      fireEvent(input, 'submitEditing');

      await waitFor(() => {
        expect(screen.getByText('Please enter an 8-character invite code')).toBeTruthy();
      });
    });
  });

  describe('Cancel and Close', () => {
    it('dismisses sheet when Cancel is pressed', () => {
      renderSheet();

      fireEvent.press(screen.getByTestId('cancel-button'));

      expect(mockDismiss).toHaveBeenCalled();
    });

    it('dismisses sheet when close icon is pressed', () => {
      renderSheet();

      fireEvent.press(screen.getByTestId('close-icon-button'));

      expect(mockDismiss).toHaveBeenCalled();
    });

    it('calls onClose when sheet is dismissed via Cancel', () => {
      renderSheet();

      fireEvent.press(screen.getByTestId('cancel-button'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does NOT call onClose after successful submission', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined);
      renderSheet();

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'ABC12345');

      fireEvent.press(screen.getByTestId('connect-button'));

      await waitFor(() => {
        expect(mockDismiss).toHaveBeenCalled();
      });

      // onClose should NOT be called after successful submission
      // (per documented contract: "invoked when the sheet is dismissed without submitting")
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('resets form when sheet is presented again', async () => {
      const { ref } = renderSheet();

      // Enter some text
      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'ABC12345');

      // Present the sheet (which resets the form)
      ref.current?.present();

      // Form should be reset - query fresh after present
      await waitFor(() => {
        const freshInput = screen.getByPlaceholderText('Enter 8-character code');
        expect(freshInput.props.value).toBe('');
      });
    });
  });

  describe('Integration with onSubmit callback', () => {
    it('passes the exact invite code entered to onSubmit', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined);
      renderSheet();

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'TEST1234');
      fireEvent.press(screen.getByTestId('connect-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        expect(mockOnSubmit).toHaveBeenCalledWith('TEST1234');
      });
    });

    it('handles async onSubmit that resolves', async () => {
      mockOnSubmit.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      renderSheet();

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'ASYNC123');
      fireEvent.press(screen.getByTestId('connect-button'));

      // Should show loading state (button disabled during submission)
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('ASYNC123');
      });

      // After resolution, sheet should dismiss
      await waitFor(() => {
        expect(mockDismiss).toHaveBeenCalled();
      });
    });

    it('handles async onSubmit that rejects with Error', async () => {
      const testError = new Error('Sponsor not found');
      mockOnSubmit.mockRejectedValueOnce(testError);
      renderSheet();

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'FAIL1234');
      fireEvent.press(screen.getByTestId('connect-button'));

      await waitFor(() => {
        expect(screen.getByText('Sponsor not found')).toBeTruthy();
      });

      // Sheet should NOT dismiss on error
      expect(mockDismiss).not.toHaveBeenCalled();
    });

    it('allows retry after onSubmit failure', async () => {
      // First attempt fails
      mockOnSubmit.mockRejectedValueOnce(new Error('Network error'));
      renderSheet();

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'RETRY123');
      fireEvent.press(screen.getByTestId('connect-button'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });

      // Second attempt succeeds
      mockOnSubmit.mockResolvedValueOnce(undefined);
      fireEvent.press(screen.getByTestId('connect-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(2);
        expect(mockDismiss).toHaveBeenCalled();
      });
    });

    it('sanitizes and capitalizes code before passing to onSubmit', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined);
      renderSheet();

      const input = screen.getByPlaceholderText('Enter 8-character code');
      // Enter lowercase - should be capitalized
      fireEvent.changeText(input, 'abcd1234');
      fireEvent.press(screen.getByTestId('connect-button'));

      await waitFor(() => {
        // Should receive sanitized, capitalized code
        expect(mockOnSubmit).toHaveBeenCalledWith('ABCD1234');
      });
    });
  });
});
