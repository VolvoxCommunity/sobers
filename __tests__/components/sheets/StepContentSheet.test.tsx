// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StepContentSheet from '@/components/sheets/StepContentSheet';
import { GlassBottomSheetRef } from '@/components/GlassBottomSheet';
import { ThemeProvider } from '@/contexts/ThemeContext';
import type { StepContent, UserStepProgress } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================
jest.mock('@/lib/logger');

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  CheckCircle: 'CheckCircle',
  Circle: 'Circle',
}));

// Mock GlassBottomSheet
jest.mock('@/components/GlassBottomSheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockGlassBottomSheet = React.forwardRef(({ children }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      present: jest.fn(),
      dismiss: jest.fn(),
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

// =============================================================================
// Test Data
// =============================================================================
const mockStep: StepContent = {
  id: 'step-1',
  step_number: 1,
  title: 'We admitted we were powerless',
  description: 'We admitted we were powerless over alcohol—that our lives had become unmanageable.',
  detailed_content:
    'This is the first step in recovery. It involves acknowledging that we cannot control our addiction and that our attempts to manage it have failed.',
  reflection_prompts: [
    'Can you identify specific times when your life felt unmanageable?',
    'What does powerlessness mean to you?',
    'How has denial kept you from admitting powerlessness?',
  ],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockProgress: UserStepProgress = {
  id: 'progress-1',
  user_id: 'user-123',
  step_number: 1,
  completed: true,
  completed_at: '2024-01-15T00:00:00Z',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

// =============================================================================
// Helper Functions
// =============================================================================
const renderWithProviders = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

// =============================================================================
// Tests
// =============================================================================
describe('StepContentSheet', () => {
  let sheetRef: React.RefObject<GlassBottomSheetRef>;
  const mockOnToggleCompletion = jest.fn();
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    sheetRef = React.createRef<GlassBottomSheetRef>();
  });

  describe('Rendering', () => {
    it('renders null when step is null', () => {
      const { queryByText } = renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={null}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      expect(queryByText('Step 1')).toBeNull();
    });

    it('renders the step number in header', () => {
      const { getByText } = renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={mockStep}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('Step 1')).toBeTruthy();
    });

    it('renders the step title', () => {
      const { getByText } = renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={mockStep}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('We admitted we were powerless')).toBeTruthy();
    });

    it('renders the step description', () => {
      const { getByText } = renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={mockStep}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      expect(
        getByText(
          'We admitted we were powerless over alcohol—that our lives had become unmanageable.'
        )
      ).toBeTruthy();
    });

    it('renders the detailed content section', () => {
      const { getByText } = renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={mockStep}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('Understanding This Step')).toBeTruthy();
      expect(
        getByText(/This is the first step in recovery. It involves acknowledging/)
      ).toBeTruthy();
    });

    it('renders reflection questions section when prompts exist', () => {
      const { getByText } = renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={mockStep}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('Reflection Questions')).toBeTruthy();
      expect(
        getByText(/Can you identify specific times when your life felt unmanageable/)
      ).toBeTruthy();
      expect(getByText(/What does powerlessness mean to you/)).toBeTruthy();
      expect(getByText(/How has denial kept you from admitting powerlessness/)).toBeTruthy();
    });

    it('does not render reflection questions section when no prompts', () => {
      const stepWithoutPrompts = { ...mockStep, reflection_prompts: [] };

      const { queryByText } = renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={stepWithoutPrompts}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      expect(queryByText('Reflection Questions')).toBeNull();
    });

    it('renders "Mark as Complete" button when step is not completed', () => {
      const { getByText } = renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={mockStep}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('Mark as Complete')).toBeTruthy();
    });

    it('renders "Marked as Complete" button when step is completed', () => {
      const { getByText } = renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={mockStep}
          progress={mockProgress}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('Marked as Complete')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('calls onToggleCompletion with step number when completion button is pressed', () => {
      const { getByText } = renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={mockStep}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      const completeButton = getByText('Mark as Complete');
      fireEvent.press(completeButton);

      expect(mockOnToggleCompletion).toHaveBeenCalledWith(1);
    });

    it('calls onToggleCompletion when completed step button is pressed', () => {
      const { getByText } = renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={mockStep}
          progress={mockProgress}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      const completeButton = getByText('Marked as Complete');
      fireEvent.press(completeButton);

      expect(mockOnToggleCompletion).toHaveBeenCalledWith(1);
    });
  });

  describe('Imperative API', () => {
    it('exposes present method via ref', () => {
      renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={mockStep}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      expect(sheetRef.current).toBeDefined();
      expect(sheetRef.current?.present).toBeDefined();
      expect(typeof sheetRef.current?.present).toBe('function');
    });

    it('exposes dismiss method via ref', () => {
      renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={mockStep}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      expect(sheetRef.current?.dismiss).toBeDefined();
      expect(typeof sheetRef.current?.dismiss).toBe('function');
    });

    it('exposes snapToIndex method via ref', () => {
      renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={mockStep}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      expect(sheetRef.current?.snapToIndex).toBeDefined();
      expect(typeof sheetRef.current?.snapToIndex).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('handles step with different step number correctly', () => {
      const step5 = { ...mockStep, step_number: 5, title: 'Step Five' };

      const { getByText } = renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={step5}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText('Step 5')).toBeTruthy();

      const completeButton = getByText('Mark as Complete');
      fireEvent.press(completeButton);

      expect(mockOnToggleCompletion).toHaveBeenCalledWith(5);
    });

    it('does not crash with null reflection_prompts', () => {
      const stepWithNullPrompts = { ...mockStep, reflection_prompts: null as any };

      const { queryByText } = renderWithProviders(
        <StepContentSheet
          ref={sheetRef}
          step={stepWithNullPrompts}
          onToggleCompletion={mockOnToggleCompletion}
          onDismiss={mockOnDismiss}
        />
      );

      expect(queryByText('Reflection Questions')).toBeNull();
    });
  });
});
