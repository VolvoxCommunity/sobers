import Toast from 'react-native-toast-message';
import { showToast, createToastConfig } from '@/lib/toast';
import { render } from '@testing-library/react-native';

// Clear mock calls between tests
beforeEach(() => {
  jest.clearAllMocks();
});

describe('showToast', () => {
  describe('success', () => {
    it('calls Toast.show with success type and 3s visibility', () => {
      showToast.success('Task completed');

      expect(Toast.show).toHaveBeenCalledWith({
        type: 'success',
        text1: 'Task completed',
        visibilityTime: 3000,
      });
    });

    it('handles empty message', () => {
      showToast.success('');

      expect(Toast.show).toHaveBeenCalledWith({
        type: 'success',
        text1: '',
        visibilityTime: 3000,
      });
    });

    it('handles special characters in message', () => {
      const message = 'Task "completed" with 100% success! 🎉';
      showToast.success(message);

      expect(Toast.show).toHaveBeenCalledWith({
        type: 'success',
        text1: message,
        visibilityTime: 3000,
      });
    });

    it('handles long messages', () => {
      const longMessage = 'A'.repeat(500);
      showToast.success(longMessage);

      expect(Toast.show).toHaveBeenCalledWith({
        type: 'success',
        text1: longMessage,
        visibilityTime: 3000,
      });
    });
  });

  describe('error', () => {
    it('calls Toast.show with error type and 5s visibility', () => {
      showToast.error('Something went wrong');

      expect(Toast.show).toHaveBeenCalledWith({
        type: 'error',
        text1: 'Something went wrong',
        visibilityTime: 5000,
      });
    });

    it('has longer visibility than success toast', () => {
      showToast.success('Success');
      showToast.error('Error');

      const successCall = (Toast.show as jest.Mock).mock.calls[0][0];
      const errorCall = (Toast.show as jest.Mock).mock.calls[1][0];

      expect(errorCall.visibilityTime).toBeGreaterThan(successCall.visibilityTime);
    });

    it('handles network error messages', () => {
      const networkError = 'Network request failed. Please check your connection.';
      showToast.error(networkError);

      expect(Toast.show).toHaveBeenCalledWith({
        type: 'error',
        text1: networkError,
        visibilityTime: 5000,
      });
    });
  });

  describe('info', () => {
    it('calls Toast.show with info type and 3s visibility', () => {
      showToast.info('Check your email');

      expect(Toast.show).toHaveBeenCalledWith({
        type: 'info',
        text1: 'Check your email',
        visibilityTime: 3000,
      });
    });

    it('has same visibility as success toast', () => {
      showToast.success('Success');
      showToast.info('Info');

      const successCall = (Toast.show as jest.Mock).mock.calls[0][0];
      const infoCall = (Toast.show as jest.Mock).mock.calls[1][0];

      expect(infoCall.visibilityTime).toBe(successCall.visibilityTime);
    });
  });

  describe('multiple toasts', () => {
    it('can show multiple toasts in sequence', () => {
      showToast.success('First');
      showToast.error('Second');
      showToast.info('Third');

      expect(Toast.show).toHaveBeenCalledTimes(3);
    });

    it('each toast call is independent', () => {
      showToast.success('Success message');
      showToast.error('Error message');

      const calls = (Toast.show as jest.Mock).mock.calls;
      expect(calls[0][0].type).toBe('success');
      expect(calls[0][0].text1).toBe('Success message');
      expect(calls[1][0].type).toBe('error');
      expect(calls[1][0].text1).toBe('Error message');
    });
  });
});

describe('createToastConfig', () => {
  it('returns config object with success, error, and info renderers', () => {
    const config = createToastConfig(false);

    expect(config).toHaveProperty('success');
    expect(config).toHaveProperty('error');
    expect(config).toHaveProperty('info');
    expect(typeof config.success).toBe('function');
    expect(typeof config.error).toBe('function');
    expect(typeof config.info).toBe('function');
  });

  it('creates config for light mode', () => {
    const config = createToastConfig(false);
    expect(config).toBeDefined();
  });

  it('creates config for dark mode', () => {
    const config = createToastConfig(true);
    expect(config).toBeDefined();
  });

  describe('toast renderers', () => {
    it('success renderer returns a React element', () => {
      const config = createToastConfig(false);
      const mockProps = { text1: 'Test message' };
      const element = config.success!(mockProps as never);

      expect(element).toBeTruthy();
      expect(element.type).toBeDefined();
    });

    it('error renderer returns a React element', () => {
      const config = createToastConfig(false);
      const mockProps = { text1: 'Error message' };
      const element = config.error!(mockProps as never);

      expect(element).toBeTruthy();
      expect(element.type).toBeDefined();
    });

    it('info renderer returns a React element', () => {
      const config = createToastConfig(false);
      const mockProps = { text1: 'Info message' };
      const element = config.info!(mockProps as never);

      expect(element).toBeTruthy();
      expect(element.type).toBeDefined();
    });
  });

  describe('theme-based styling', () => {
    it('light mode renders with light theme', () => {
      const config = createToastConfig(false);
      const element = config.success!({ text1: 'Test' } as never);
      const { getByText } = render(element);

      expect(getByText('Test')).toBeTruthy();
    });

    it('dark mode renders with dark theme', () => {
      const config = createToastConfig(true);
      const element = config.success!({ text1: 'Test' } as never);
      const { getByText } = render(element);

      expect(getByText('Test')).toBeTruthy();
    });

    it('success toast renders correctly', () => {
      const config = createToastConfig(false);
      const element = config.success!({ text1: 'Success!' } as never);
      const { getByText } = render(element);

      expect(getByText('Success!')).toBeTruthy();
    });

    it('error toast renders correctly', () => {
      const config = createToastConfig(false);
      const element = config.error!({ text1: 'Error!' } as never);
      const { getByText } = render(element);

      expect(getByText('Error!')).toBeTruthy();
    });

    it('info toast renders correctly', () => {
      const config = createToastConfig(false);
      const element = config.info!({ text1: 'Info!' } as never);
      const { getByText } = render(element);

      expect(getByText('Info!')).toBeTruthy();
    });
  });

  describe('toast content', () => {
    it('renders the message text', () => {
      const config = createToastConfig(false);
      const element = config.success!({ text1: 'Hello World' } as never);
      const { getByText } = render(element);

      expect(getByText('Hello World')).toBeTruthy();
    });

    it('renders long messages without truncation', () => {
      const config = createToastConfig(false);
      const longMessage =
        'This is a very long message that should wrap to multiple lines without being truncated. It contains important information that the user needs to read completely.';
      const element = config.success!({ text1: longMessage } as never);
      const { getByText } = render(element);

      // Full message should be present
      expect(getByText(longMessage)).toBeTruthy();
    });

    it('handles empty text gracefully', () => {
      const config = createToastConfig(false);
      const element = config.success!({ text1: '' } as never);
      const { toJSON } = render(element);

      // Should render without crashing
      expect(toJSON()).toBeTruthy();
    });

    it('handles undefined text gracefully', () => {
      const config = createToastConfig(false);
      const element = config.success!({} as never);
      const { toJSON } = render(element);

      // Should render without crashing
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('all toast types render', () => {
    it('success, error, and info all render properly', () => {
      const config = createToastConfig(false);

      const successElement = config.success!({ text1: 'Success' } as never);
      const errorElement = config.error!({ text1: 'Error' } as never);
      const infoElement = config.info!({ text1: 'Info' } as never);

      const { getByText: getSuccess } = render(successElement);
      const { getByText: getError } = render(errorElement);
      const { getByText: getInfo } = render(infoElement);

      expect(getSuccess('Success')).toBeTruthy();
      expect(getError('Error')).toBeTruthy();
      expect(getInfo('Info')).toBeTruthy();
    });
  });
});
