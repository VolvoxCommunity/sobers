import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Render a themed 404 Not Found screen that presents a recovery-themed message and a prominent "Back to Home" CTA.
 *
 * The UI adapts colors and typography from the active theme and configures the route header title to "Lost?".
 *
 * @returns The rendered NotFoundScreen React element.
 */
export default function NotFoundScreen() {
  const { theme } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Lost?', headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Decorative compass icon */}
        <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="compass-outline" size={64} color={theme.primary} />
        </View>

        {/* 404 Header */}
        <Text style={[styles.errorCode, { color: theme.primary }]}>404</Text>

        {/* Main message with humor */}
        <Text style={[styles.title, { color: theme.text, fontFamily: theme.fontSemiBold }]}>
          Looks like you wandered off the path
        </Text>

        {/* Supportive subtext */}
        <Text
          style={[styles.subtitle, { color: theme.textSecondary, fontFamily: theme.fontRegular }]}
        >
          Don&apos;t worry — even the best navigators take a wrong turn sometimes.{'\n'}
          The important thing is finding your way back.
        </Text>

        {/* Recovery-themed encouragement */}
        <View
          style={[
            styles.quoteContainer,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text
            style={[styles.quote, { color: theme.textSecondary, fontFamily: theme.fontRegular }]}
          >
            &ldquo;Progress, not perfection.&rdquo;
          </Text>
        </View>

        {/* CTA Button */}
        <Link href="/" asChild>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="home-outline" size={20} color={theme.textOnPrimary} />
              <Text
                style={[
                  styles.buttonText,
                  { color: theme.textOnPrimary, fontFamily: theme.fontMedium },
                ]}
              >
                Back to Home
              </Text>
            </View>
          </Pressable>
        </Link>

        {/* Footer hint */}
        <Text style={[styles.hint, { color: theme.textTertiary, fontFamily: theme.fontRegular }]}>
          One step at a time
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorCode: {
    fontSize: 72,
    fontWeight: '800',
    letterSpacing: -2,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 24,
  },
  quoteContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
  },
  quote: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginBottom: 24,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
  },
  hint: {
    fontSize: 13,
    position: 'absolute',
    bottom: 40,
  },
});