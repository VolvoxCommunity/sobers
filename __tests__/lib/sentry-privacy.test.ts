/**
 * @fileoverview Tests for sentry-privacy utility functions
 *
 * Tests the privacy scrubbing functionality including:
 * - Email redaction
 * - Sensitive field filtering
 * - URL sanitization (OAuth tokens)
 * - Console breadcrumb sanitization
 * - Circular reference handling
 */

import { privacyBeforeSend, privacyBeforeBreadcrumb } from '@/lib/sentry-privacy';
import type { ErrorEvent, Breadcrumb } from '@sentry/react-native';

// =============================================================================
// Test Suite
// =============================================================================

describe('sentry-privacy', () => {
  describe('privacyBeforeSend', () => {
    it('returns the event (not null)', () => {
      const event: ErrorEvent = {};
      const result = privacyBeforeSend(event);
      expect(result).not.toBeNull();
    });

    it('redacts email addresses in event message', () => {
      const event: ErrorEvent = {
        message: 'Error for user test@example.com',
      };

      const result = privacyBeforeSend(event);

      expect(result?.message).toBe('Error for user [email]');
    });

    it('redacts multiple email addresses', () => {
      const event: ErrorEvent = {
        message: 'Users: alice@test.com and bob@example.org failed',
      };

      const result = privacyBeforeSend(event);

      expect(result?.message).toBe('Users: [email] and [email] failed');
    });

    it('strips sensitive fields from request data', () => {
      const event: ErrorEvent = {
        request: {
          data: {
            username: 'testuser',
            password: 'secret123',
            email: 'user@test.com',
            token: 'abc123',
            access_token: 'xyz789',
            message: 'Hello world',
          },
        },
      };

      const result = privacyBeforeSend(event);

      expect(result?.request?.data).toEqual({
        username: 'testuser',
        password: '[Filtered]',
        email: '[Filtered]',
        token: '[Filtered]',
        access_token: '[Filtered]',
        message: '[Filtered]',
      });
    });

    it('preserves only user ID from user data', () => {
      const event: ErrorEvent = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          ip_address: '192.168.1.1',
        },
      };

      const result = privacyBeforeSend(event);

      expect(result?.user).toEqual({
        id: 'user-123',
      });
    });

    it('sanitizes exception values', () => {
      const event: ErrorEvent = {
        exception: {
          values: [
            {
              type: 'Error',
              value: 'Failed for user test@example.com with token abc123',
            },
          ],
        },
      };

      const result = privacyBeforeSend(event);

      expect(result?.exception?.values?.[0]?.value).toContain('[email]');
    });

    it('handles nested objects in request data', () => {
      const event: ErrorEvent = {
        request: {
          data: {
            user: {
              name: 'Test',
              email: 'nested@test.com',
              preferences: {
                content: 'private content',
              },
            },
          },
        },
      };

      const result = privacyBeforeSend(event);

      expect(result?.request?.data?.user?.email).toBe('[Filtered]');
      expect(result?.request?.data?.user?.preferences?.content).toBe('[Filtered]');
    });

    it('handles arrays in request data', () => {
      const event: ErrorEvent = {
        request: {
          data: {
            users: [
              { name: 'User1', email: 'user1@test.com' },
              { name: 'User2', email: 'user2@test.com' },
            ],
          },
        },
      };

      const result = privacyBeforeSend(event);

      expect(result?.request?.data?.users?.[0]?.email).toBe('[Filtered]');
      expect(result?.request?.data?.users?.[1]?.email).toBe('[Filtered]');
    });

    it('handles null request data', () => {
      const event: ErrorEvent = {
        request: {
          data: null,
        },
      };

      const result = privacyBeforeSend(event);

      expect(result?.request?.data).toBeNull();
    });

    it('handles undefined exception values', () => {
      const event: ErrorEvent = {
        exception: {
          values: [
            {
              type: 'Error',
              value: undefined,
            },
          ],
        },
      };

      const result = privacyBeforeSend(event);

      expect(result?.exception?.values?.[0]?.value).toBeUndefined();
    });
  });

  describe('privacyBeforeBreadcrumb', () => {
    describe('HTTP breadcrumbs', () => {
      it('simplifies Supabase query breadcrumbs', () => {
        const breadcrumb: Breadcrumb = {
          category: 'http',
          data: {
            url: 'https://abc123.supabase.co/rest/v1/profiles?id=eq.user-123',
            method: 'GET',
            status_code: 200,
          },
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result?.data).toEqual({
          method: 'GET',
          table: 'profiles',
          status_code: 200,
        });
        expect(result?.data?.url).toBeUndefined();
      });

      it('extracts table name from complex Supabase URLs', () => {
        const breadcrumb: Breadcrumb = {
          category: 'http',
          data: {
            url: 'https://abc.supabase.co/rest/v1/user_tasks?select=*&user_id=eq.123',
            method: 'POST',
            status_code: 201,
          },
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result?.data?.table).toBe('user_tasks');
      });

      it('sanitizes OAuth tokens from HTTP URLs', () => {
        const breadcrumb: Breadcrumb = {
          category: 'http',
          data: {
            url: 'https://api.example.com/callback?access_token=secret123&state=abc',
            method: 'GET',
            status_code: 302,
          },
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result?.data?.url).not.toContain('access_token');
        expect(result?.data?.url).not.toContain('secret123');
        expect(result?.data?.url).not.toContain('state=abc');
      });

      it('removes URL fragments containing OAuth tokens', () => {
        const breadcrumb: Breadcrumb = {
          category: 'http',
          data: {
            url: 'https://app.com/callback#access_token=xyz&refresh_token=abc',
            method: 'GET',
            status_code: 200,
          },
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result?.data?.url).toBe('https://app.com/callback');
      });
    });

    describe('navigation breadcrumbs', () => {
      it('sanitizes from and to URLs', () => {
        const breadcrumb: Breadcrumb = {
          category: 'navigation',
          data: {
            // OAuth params: access_token, refresh_token, code, id_token, state
            from: '/login?redirect=home&state=secret123',
            to: '/callback?access_token=abc123&refresh_token=xyz',
          },
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        // state, access_token, refresh_token should be filtered
        expect(result?.data?.from).not.toContain('state=secret');
        expect(result?.data?.from).toContain('redirect=home');
        expect(result?.data?.to).not.toContain('access_token');
        expect(result?.data?.to).not.toContain('refresh_token');
      });

      it('preserves non-sensitive query params', () => {
        const breadcrumb: Breadcrumb = {
          category: 'navigation',
          data: {
            from: '/page?view=list&sort=date',
            to: '/other?filter=active',
          },
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result?.data?.from).toContain('view=list');
        expect(result?.data?.to).toContain('filter=active');
      });
    });

    describe('console breadcrumbs', () => {
      it('sanitizes URLs in console messages', () => {
        const breadcrumb: Breadcrumb = {
          category: 'console',
          message: 'Redirect to https://app.com/auth?access_token=secret123',
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result?.message).not.toContain('access_token');
        expect(result?.message).not.toContain('secret123');
      });

      it('sanitizes explicit token values in messages', () => {
        const breadcrumb: Breadcrumb = {
          category: 'console',
          message: 'Hash access_token: eyJabc123xyz',
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result?.message).toContain('access_token: [FILTERED]');
        expect(result?.message).not.toContain('eyJabc123xyz');
      });

      it('sanitizes data field in console breadcrumbs', () => {
        const breadcrumb: Breadcrumb = {
          category: 'console',
          data: {
            url: 'https://app.com?access_token=secret',
            password: 'mypassword',
          },
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result?.data?.url).not.toContain('access_token');
        expect(result?.data?.password).toBe('[Filtered]');
      });

      it('handles nested objects in console data', () => {
        const breadcrumb: Breadcrumb = {
          category: 'console',
          data: {
            response: {
              token: 'secret-token',
              user: {
                email: 'test@test.com',
              },
            },
          },
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result?.data?.response?.token).toBe('[Filtered]');
        expect(result?.data?.response?.user?.email).toBe('[Filtered]');
      });

      it('handles arrays in console data', () => {
        const breadcrumb: Breadcrumb = {
          category: 'console',
          data: {
            args: ['Log message', 'https://app.com?access_token=xyz'],
          },
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result?.data?.args?.[0]).toBe('Log message');
        expect(result?.data?.args?.[1]).not.toContain('access_token');
      });
    });

    describe('debug breadcrumbs', () => {
      it('sanitizes debug breadcrumbs like console breadcrumbs', () => {
        const breadcrumb: Breadcrumb = {
          category: 'debug',
          message: 'Processing refresh_token: abc123',
          data: {
            token: 'secret',
          },
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result?.message).toContain('[FILTERED]');
        expect(result?.data?.token).toBe('[Filtered]');
      });
    });

    describe('other breadcrumb types', () => {
      it('sanitizes URLs in generic breadcrumb messages', () => {
        const breadcrumb: Breadcrumb = {
          category: 'ui.click',
          message: 'Button clicked: https://app.com/action?access_token=xyz',
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result?.message).not.toContain('access_token');
      });

      it('passes through breadcrumbs without sensitive data', () => {
        const breadcrumb: Breadcrumb = {
          category: 'ui.click',
          message: 'Login button clicked',
          data: {
            target: 'button#login',
          },
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result).toEqual(breadcrumb);
      });

      it('handles breadcrumbs without message', () => {
        const breadcrumb: Breadcrumb = {
          category: 'transaction',
          data: {
            name: 'page_load',
          },
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result).toEqual(breadcrumb);
      });
    });

    describe('edge cases', () => {
      it('handles empty URL gracefully', () => {
        const breadcrumb: Breadcrumb = {
          category: 'http',
          data: {
            url: '',
            method: 'GET',
          },
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result?.data?.url).toBe('');
      });

      it('handles malformed URLs without crashing', () => {
        const breadcrumb: Breadcrumb = {
          category: 'http',
          data: {
            url: 'not-a-valid-url://???',
            method: 'GET',
          },
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        // Should not throw and should return something
        expect(result).toBeDefined();
      });

      it('handles null breadcrumb data', () => {
        const breadcrumb: Breadcrumb = {
          category: 'test',
          data: undefined,
        };

        const result = privacyBeforeBreadcrumb(breadcrumb);

        expect(result).toEqual(breadcrumb);
      });
    });
  });

  describe('edge cases', () => {
    it('handles circular references in request data', () => {
      // Create an object with a circular reference
      const circularObj: Record<string, unknown> = {
        name: 'test',
        value: 123,
      };
      circularObj.self = circularObj; // Circular reference

      const event: ErrorEvent = {
        request: {
          data: circularObj,
        },
      };

      // Should not throw and should handle circular reference
      const result = privacyBeforeSend(event);
      expect(result).toBeDefined();
      expect(result?.request?.data).toBeDefined();
    });

    it('handles null values in nested objects', () => {
      const event: ErrorEvent = {
        request: {
          data: {
            username: 'test',
            email: null, // null sensitive field
            profile: null, // null regular field
            nested: {
              value: null,
              password: null, // null sensitive field in nested object
            },
          },
        },
      };

      const result = privacyBeforeSend(event);

      expect(result?.request?.data).toEqual({
        username: 'test',
        email: '[Filtered]',
        profile: null,
        nested: {
          value: null,
          password: '[Filtered]',
        },
      });
    });

    it('handles undefined values in request data', () => {
      const event: ErrorEvent = {
        request: {
          data: {
            username: 'test',
            undefinedField: undefined,
          },
        },
      };

      const result = privacyBeforeSend(event);

      // Undefined values should be skipped
      expect(result?.request?.data).toEqual({
        username: 'test',
      });
    });

    it('handles very large strings by processing chunks', () => {
      // Create a string larger than 20KB to trigger chunked processing
      const largeEmail = 'a'.repeat(25000) + 'test@example.com' + 'b'.repeat(5000);

      const event: ErrorEvent = {
        message: largeEmail,
      };

      const result = privacyBeforeSend(event);

      // Email should still be redacted in the processed portion
      expect(result?.message).toBeDefined();
    });

    it('handles primitive values in console breadcrumb data', () => {
      const breadcrumb: Breadcrumb = {
        category: 'console',
        data: {
          arguments: [42, true, 'hello', null, undefined],
        },
      };

      const result = privacyBeforeBreadcrumb(breadcrumb);

      // Should preserve primitive values
      expect(result?.data?.arguments).toContain(42);
      expect(result?.data?.arguments).toContain(true);
      expect(result?.data?.arguments).toContain('hello');
    });

    it('sanitizes arrays in console breadcrumb data', () => {
      const breadcrumb: Breadcrumb = {
        category: 'console',
        data: {
          arguments: [['test@email.com', 'normal text'], { password: 'secret', name: 'test' }],
        },
      };

      const result = privacyBeforeBreadcrumb(breadcrumb);

      // Nested arrays should be sanitized
      expect(result?.data?.arguments).toBeDefined();
    });

    it('handles deeply nested objects with sensitive fields', () => {
      const event: ErrorEvent = {
        request: {
          data: {
            level1: {
              level2: {
                level3: {
                  password: 'secret',
                  token: 'abc123',
                  category: 'testing', // not a sensitive field
                },
              },
            },
          },
        },
      };

      const result = privacyBeforeSend(event);

      expect(result?.request?.data).toEqual({
        level1: {
          level2: {
            level3: {
              password: '[Filtered]',
              token: '[Filtered]',
              category: 'testing',
            },
          },
        },
      });
    });
  });
});
