import Toast from 'react-native-toast-message';
import { showToast, createToastConfig } from '@/lib/toast';

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
});
