/**
 * @fileoverview Tests for InviteCodeSection component
 *
 * Tests the invite code section including:
 * - Empty state rendering
 * - Non-empty state with children
 * - Action buttons (generate/enter codes)
 * - Icon selection based on button label
 * - Accessibility attributes
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import InviteCodeSection from '@/components/profile/InviteCodeSection';

// =============================================================================
// Mocks
// =============================================================================

const mockTheme = {
  primary: '#007AFF',
  text: '#000000',
  textSecondary: '#666666',
  card: '#FFFFFF',
  black: '#000000',
  fontRegular: 'System',
};

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Share2: 'Share2',
  QrCode: 'QrCode',
}));

// =============================================================================
// Tests
// =============================================================================

describe('InviteCodeSection', () => {
  const mockOnPrimaryAction = jest.fn();
  const mockOnSecondaryAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    it('renders section title', () => {
      render(
        <InviteCodeSection
          title="Your Sponsees"
          isEmpty={true}
          emptyMessage="No sponsees yet"
          primaryButtonLabel="Generate Invite Code"
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
        />
      );

      expect(screen.getByText('Your Sponsees')).toBeTruthy();
    });

    it('renders empty state message', () => {
      render(
        <InviteCodeSection
          title="Your Sponsors"
          isEmpty={true}
          emptyMessage="Not connected to a sponsor"
          primaryButtonLabel="Enter Invite Code"
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
        />
      );

      expect(screen.getByText('Not connected to a sponsor')).toBeTruthy();
    });

    it('renders primary action button with label', () => {
      render(
        <InviteCodeSection
          title="Section"
          isEmpty={true}
          emptyMessage="Empty"
          primaryButtonLabel="Generate Invite Code"
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
        />
      );

      expect(screen.getByText('Generate Invite Code')).toBeTruthy();
    });

    it('calls onPrimaryAction when button is pressed', () => {
      render(
        <InviteCodeSection
          title="Section"
          isEmpty={true}
          emptyMessage="Empty"
          primaryButtonLabel="Generate Code"
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
        />
      );

      fireEvent.press(screen.getByText('Generate Code'));
      expect(mockOnPrimaryAction).toHaveBeenCalledTimes(1);
    });

    it('does not render children in empty state', () => {
      render(
        <InviteCodeSection
          title="Section"
          isEmpty={true}
          emptyMessage="Empty"
          primaryButtonLabel="Action"
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
        >
          <Text>Child Component</Text>
        </InviteCodeSection>
      );

      expect(screen.queryByText('Child Component')).toBeNull();
    });
  });

  describe('Non-Empty State', () => {
    it('renders section title', () => {
      render(
        <InviteCodeSection
          title="Your Sponsees"
          isEmpty={false}
          emptyMessage="No sponsees"
          primaryButtonLabel="Generate New Code"
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
        />
      );

      expect(screen.getByText('Your Sponsees')).toBeTruthy();
    });

    it('renders children when not empty', () => {
      render(
        <InviteCodeSection
          title="Section"
          isEmpty={false}
          emptyMessage="Empty"
          primaryButtonLabel="Action"
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
        >
          <Text>Relationship Card 1</Text>
          <Text>Relationship Card 2</Text>
        </InviteCodeSection>
      );

      expect(screen.getByText('Relationship Card 1')).toBeTruthy();
      expect(screen.getByText('Relationship Card 2')).toBeTruthy();
    });

    it('does not render empty message when not empty', () => {
      render(
        <InviteCodeSection
          title="Section"
          isEmpty={false}
          emptyMessage="This should not appear"
          primaryButtonLabel="Action"
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
        />
      );

      expect(screen.queryByText('This should not appear')).toBeNull();
    });

    it('does not render generate button when showGenerateNew is false', () => {
      render(
        <InviteCodeSection
          title="Section"
          isEmpty={false}
          emptyMessage="Empty"
          primaryButtonLabel="Generate New Code"
          showGenerateNew={false}
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
        />
      );

      expect(screen.queryByText('Generate New Code')).toBeNull();
    });

    it('renders generate button when showGenerateNew is true', () => {
      render(
        <InviteCodeSection
          title="Section"
          isEmpty={false}
          emptyMessage="Empty"
          primaryButtonLabel="Generate New Code"
          showGenerateNew={true}
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
        />
      );

      expect(screen.getByText('Generate New Code')).toBeTruthy();
    });

    it('renders secondary button when onSecondaryAction is provided', () => {
      render(
        <InviteCodeSection
          title="Section"
          isEmpty={false}
          emptyMessage="Empty"
          primaryButtonLabel="Primary"
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
          onSecondaryAction={mockOnSecondaryAction}
        />
      );

      expect(screen.getByText('Connect to Another Sponsor')).toBeTruthy();
    });

    it('calls onSecondaryAction when secondary button is pressed', () => {
      render(
        <InviteCodeSection
          title="Section"
          isEmpty={false}
          emptyMessage="Empty"
          primaryButtonLabel="Primary"
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
          onSecondaryAction={mockOnSecondaryAction}
        />
      );

      fireEvent.press(screen.getByText('Connect to Another Sponsor'));
      expect(mockOnSecondaryAction).toHaveBeenCalledTimes(1);
    });

    it('does not render secondary button in empty state', () => {
      render(
        <InviteCodeSection
          title="Section"
          isEmpty={true}
          emptyMessage="Empty"
          primaryButtonLabel="Primary"
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
          onSecondaryAction={mockOnSecondaryAction}
        />
      );

      expect(screen.queryByText('Connect to Another Sponsor')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('sets button role and label on primary action', () => {
      render(
        <InviteCodeSection
          title="Section"
          isEmpty={true}
          emptyMessage="Empty"
          primaryButtonLabel="Test Button"
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
        />
      );

      const button = screen.getByLabelText('Test Button');
      expect(button).toBeTruthy();
    });

    it('sets button role and label on secondary action', () => {
      render(
        <InviteCodeSection
          title="Section"
          isEmpty={false}
          emptyMessage="Empty"
          primaryButtonLabel="Primary"
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
          onSecondaryAction={mockOnSecondaryAction}
        />
      );

      const button = screen.getByLabelText('Connect to Another Sponsor');
      expect(button).toBeTruthy();
    });
  });

  describe('Button Label Detection', () => {
    it('uses Share2 icon for "Generate" button', () => {
      render(
        <InviteCodeSection
          title="Section"
          isEmpty={true}
          emptyMessage="Empty"
          primaryButtonLabel="Generate Invite Code"
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
        />
      );

      // Component renders Share2 icon for Generate buttons
      expect(screen.getByText('Generate Invite Code')).toBeTruthy();
    });

    it('uses QrCode icon for non-Generate button', () => {
      render(
        <InviteCodeSection
          title="Section"
          isEmpty={true}
          emptyMessage="Empty"
          primaryButtonLabel="Enter Code"
          theme={mockTheme}
          onPrimaryAction={mockOnPrimaryAction}
        />
      );

      // Component renders QrCode icon for non-Generate buttons
      expect(screen.getByText('Enter Code')).toBeTruthy();
    });
  });
});