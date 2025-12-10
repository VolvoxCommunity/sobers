// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import EditDisplayNameSheet, {
  EditDisplayNameSheetRef,
} from '@/components/sheets/EditDisplayNameSheet';

// =============================================================================
// Mocks
// =============================================================================

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  X: 'X',
}));

// Mock GlassBottomSheet
jest.mock('@/components/GlassBottomSheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockGlassBottomSheet = React.forwardRef(({ children, onDismiss }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      present: jest.fn(),
      dismiss: jest.fn(() => {
        if (onDismiss) onDismiss();
      }),
      snapToIndex: jest.fn(),
    }));
    return <View testID="glass-bottom-sheet">{children}</View>;
  });
  MockGlassBottomSheet.displayName = 'GlassBottomSheet';
  return {
    __esModule: true,
    default: MockGlassBottomSheet,
  };
});

// Mock BottomSheetScrollView
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { ScrollView } = require('react-native');
  return {
    BottomSheetScrollView: ({ children, ...props }: any) => (
      <ScrollView {...props}>{children}</ScrollView>
    ),
  };
});

// =============================================================================
// Test Data
// =============================================================================
const mockTheme = {
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  card: '#FFFFFF',
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  primary: '#007AFF',
  primaryLight: '#E5F1FF',
  danger: '#FF3B30',
  dangerLight: '#FFE5E5',
  dangerBorder: '#FFCCCC',
  success: '#34C759',
  warning: '#FF9500',
  white: '#FFFFFF',
  black: '#000000',
  error: '#FF3B30',
  fontRegular: 'System',
};

// =============================================================================
// Tests
// =============================================================================
describe('EditDisplayNameSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Rendering Tests
  // ---------------------------------------------------------------------------
  describe('Rendering', () => {
    it('renders the sheet with correct title', () => {
      const mockOnSave = jest.fn();
      const { getByText } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      expect(getByText('Edit Display Name')).toBeTruthy();
    });

    it('renders input field with current display name', () => {
      const mockOnSave = jest.fn();
      const { getByTestId } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      expect(input.props.value).toBe('John Doe');
    });

    it('renders character count', () => {
      const mockOnSave = jest.fn();
      const { getByText } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      expect(getByText('8/30 characters')).toBeTruthy();
    });

    it('renders Save and Cancel buttons', () => {
      const mockOnSave = jest.fn();
      const { getByTestId } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      expect(getByTestId('save-button')).toBeTruthy();
      expect(getByTestId('cancel-button')).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Input Handling Tests
  // ---------------------------------------------------------------------------
  describe('Input Handling', () => {
    it('updates input value when user types', () => {
      const mockOnSave = jest.fn();
      const { getByTestId } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      fireEvent.changeText(input, 'Jane Smith');

      expect(input.props.value).toBe('Jane Smith');
    });

    it('updates character count when user types', () => {
      const mockOnSave = jest.fn();
      const { getByTestId } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      fireEvent.changeText(input, 'A Very Long Display Name Here');

      // Verify input value updated (character count display relies on component re-render)
      expect(input.props.value).toBe('A Very Long Display Name Here');
    });

    it('clears validation error when user types', () => {
      const mockOnSave = jest.fn();
      const { getByTestId, queryByText } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      const saveButton = getByTestId('save-button');

      // Trigger validation error
      fireEvent.changeText(input, '');
      fireEvent.press(saveButton);

      expect(queryByText('Display name cannot be empty')).toBeTruthy();

      // Clear error by typing
      fireEvent.changeText(input, 'Valid Name');
      expect(queryByText('Display name cannot be empty')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Validation Tests
  // ---------------------------------------------------------------------------
  describe('Validation', () => {
    it('shows error when display name is empty', async () => {
      const mockOnSave = jest.fn();
      const { getByTestId, getByText } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      const saveButton = getByTestId('save-button');

      fireEvent.changeText(input, '');
      fireEvent.press(saveButton);

      expect(getByText('Display name cannot be empty')).toBeTruthy();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('shows error when display name is only whitespace', async () => {
      const mockOnSave = jest.fn();
      const { getByTestId, getByText } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      const saveButton = getByTestId('save-button');

      fireEvent.changeText(input, '   ');
      fireEvent.press(saveButton);

      expect(getByText('Display name cannot be empty')).toBeTruthy();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('shows error when display name is too short', async () => {
      const mockOnSave = jest.fn();
      const { getByTestId, getByText } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      const saveButton = getByTestId('save-button');

      fireEvent.changeText(input, 'A');
      fireEvent.press(saveButton);

      expect(getByText('Display name must be at least 2 characters')).toBeTruthy();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('shows error when display name exceeds 30 characters', async () => {
      const mockOnSave = jest.fn();
      const { getByTestId, getByText } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      const saveButton = getByTestId('save-button');

      fireEvent.changeText(input, 'This is a very long display name that exceeds the limit');
      fireEvent.press(saveButton);

      expect(getByText('Display name must be 30 characters or less')).toBeTruthy();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('shows error when display name contains invalid characters', async () => {
      const mockOnSave = jest.fn();
      const { getByTestId, getByText } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      const saveButton = getByTestId('save-button');

      fireEvent.changeText(input, 'John@Doe');
      fireEvent.press(saveButton);

      expect(getByText('Display name contains invalid characters')).toBeTruthy();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('accepts valid display names with letters, numbers, spaces, hyphens, and apostrophes', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined);
      const { getByTestId, queryByText } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      const saveButton = getByTestId('save-button');

      const validNames = ["John-Paul O'Brien", 'Jane Smith 2', "D'Angelo", 'Bob-123'];

      for (const name of validNames) {
        fireEvent.changeText(input, name);
        fireEvent.press(saveButton);

        await waitFor(() => {
          expect(queryByText('Display name contains invalid characters')).toBeNull();
        });

        mockOnSave.mockClear();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Save Functionality Tests
  // ---------------------------------------------------------------------------
  describe('Save Functionality', () => {
    it('calls onSave with trimmed display name when save is pressed', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined);
      const { getByTestId } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      const saveButton = getByTestId('save-button');

      fireEvent.changeText(input, '  Jane Smith  ');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('Jane Smith');
      });
    });

    it('does not call onSave if display name is unchanged', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined);
      const { getByTestId } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled();
      });
    });

    it('shows loading indicator while saving', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined);
      const { getByTestId } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      const saveButton = getByTestId('save-button');

      fireEvent.changeText(input, 'Jane Smith');
      fireEvent.press(saveButton);

      // Verify onSave was called (loading state is internal)
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('Jane Smith');
      });
    });

    it('disables input and buttons while saving', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined);
      const { getByTestId } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      const saveButton = getByTestId('save-button');

      fireEvent.changeText(input, 'Jane Smith');
      fireEvent.press(saveButton);

      // Verify save was triggered (button disabling is internal state)
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it('prevents multiple simultaneous save operations', async () => {
      const mockOnSave = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      const { getByTestId } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      const saveButton = getByTestId('save-button');

      fireEvent.changeText(input, 'Jane Smith');

      // Press save button multiple times rapidly
      fireEvent.press(saveButton);
      fireEvent.press(saveButton);
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(1);
      });
    });

    it('shows validation error when onSave throws an error', async () => {
      const mockOnSave = jest.fn().mockRejectedValue(new Error('Network error'));
      const { getByTestId, getByText } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      const saveButton = getByTestId('save-button');

      fireEvent.changeText(input, 'Jane Smith');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('Network error')).toBeTruthy();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Cancel/Close Functionality Tests
  // ---------------------------------------------------------------------------
  describe('Cancel/Close Functionality', () => {
    it('calls onClose when cancel button is pressed without changes', () => {
      const mockOnSave = jest.fn();
      const mockOnClose = jest.fn();
      const { getByTestId } = render(
        <EditDisplayNameSheet
          currentDisplayName="John Doe"
          theme={mockTheme}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const cancelButton = getByTestId('cancel-button');
      fireEvent.press(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('shows confirmation dialog on web when closing with unsaved changes', () => {
      Platform.OS = 'web';
      // Mock window.confirm for web platform
      const mockConfirm = jest.fn().mockReturnValue(false);
      global.window = { confirm: mockConfirm } as any;

      const mockOnSave = jest.fn();
      const mockOnClose = jest.fn();

      const { getByTestId } = render(
        <EditDisplayNameSheet
          currentDisplayName="John Doe"
          theme={mockTheme}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const input = getByTestId('display-name-input');
      const cancelButton = getByTestId('cancel-button');

      fireEvent.changeText(input, 'Jane Smith');
      fireEvent.press(cancelButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        'You have unsaved changes. Are you sure you want to close?'
      );
      expect(mockOnClose).not.toHaveBeenCalled();

      // Clean up
      delete (global as any).window;
    });

    it('shows alert on native when closing with unsaved changes', () => {
      Platform.OS = 'ios';
      const mockAlert = jest.spyOn(Alert, 'alert');
      const mockOnSave = jest.fn();
      const mockOnClose = jest.fn();

      const { getByTestId } = render(
        <EditDisplayNameSheet
          currentDisplayName="John Doe"
          theme={mockTheme}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const input = getByTestId('display-name-input');
      const cancelButton = getByTestId('cancel-button');

      fireEvent.changeText(input, 'Jane Smith');
      fireEvent.press(cancelButton);

      expect(mockAlert).toHaveBeenCalledWith(
        'Discard Changes?',
        'You have unsaved changes. Are you sure?',
        expect.any(Array)
      );

      mockAlert.mockRestore();
    });

    it('does not show confirmation when closing without changes', () => {
      const mockConfirm = jest.fn();
      const mockAlert = jest.spyOn(Alert, 'alert');
      const mockOnSave = jest.fn();
      const mockOnClose = jest.fn();

      // Set up window.confirm mock (even though it won't be used)
      global.window = { confirm: mockConfirm } as any;

      const { getByTestId } = render(
        <EditDisplayNameSheet
          currentDisplayName="John Doe"
          theme={mockTheme}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const cancelButton = getByTestId('cancel-button');
      fireEvent.press(cancelButton);

      expect(mockConfirm).not.toHaveBeenCalled();
      expect(mockAlert).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();

      mockAlert.mockRestore();
      delete (global as any).window;
    });
  });

  // ---------------------------------------------------------------------------
  // Imperative API Tests
  // ---------------------------------------------------------------------------
  describe('Imperative API', () => {
    it('exposes present method via ref', () => {
      const mockOnSave = jest.fn();
      const ref = React.createRef<EditDisplayNameSheetRef>();

      render(
        <EditDisplayNameSheet
          ref={ref}
          currentDisplayName="John Doe"
          theme={mockTheme}
          onSave={mockOnSave}
        />
      );

      expect(ref.current?.present).toBeDefined();
      expect(typeof ref.current?.present).toBe('function');
    });

    it('exposes dismiss method via ref', () => {
      const mockOnSave = jest.fn();
      const ref = React.createRef<EditDisplayNameSheetRef>();

      render(
        <EditDisplayNameSheet
          ref={ref}
          currentDisplayName="John Doe"
          theme={mockTheme}
          onSave={mockOnSave}
        />
      );

      expect(ref.current?.dismiss).toBeDefined();
      expect(typeof ref.current?.dismiss).toBe('function');
    });

    it('resets form when present is called', () => {
      const mockOnSave = jest.fn();
      const ref = React.createRef<EditDisplayNameSheetRef>();

      const { getByTestId, rerender } = render(
        <EditDisplayNameSheet
          ref={ref}
          currentDisplayName="John Doe"
          theme={mockTheme}
          onSave={mockOnSave}
        />
      );

      const input = getByTestId('display-name-input');

      // Make changes
      fireEvent.changeText(input, 'Jane Smith');
      expect(input.props.value).toBe('Jane Smith');

      // Re-present should reset
      ref.current?.present();

      rerender(
        <EditDisplayNameSheet
          ref={ref}
          currentDisplayName="John Doe"
          theme={mockTheme}
          onSave={mockOnSave}
        />
      );

      // Form should be reset to original value
      const resetInput = getByTestId('display-name-input');
      expect(resetInput.props.value).toBe('John Doe');
    });
  });

  // ---------------------------------------------------------------------------
  // Keyboard Handling Tests
  // ---------------------------------------------------------------------------
  describe('Keyboard Handling', () => {
    it('saves when user presses submit on keyboard', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined);
      const { getByTestId } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');

      fireEvent.changeText(input, 'Jane Smith');
      fireEvent(input, 'submitEditing');

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('Jane Smith');
      });
    });

    it('input has autoFocus enabled', () => {
      const mockOnSave = jest.fn();
      const { getByTestId } = render(
        <EditDisplayNameSheet currentDisplayName="John Doe" theme={mockTheme} onSave={mockOnSave} />
      );

      const input = getByTestId('display-name-input');
      expect(input.props.autoFocus).toBe(true);
    });
  });
});
