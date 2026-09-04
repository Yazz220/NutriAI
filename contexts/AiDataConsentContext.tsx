import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ExternalLink, ShieldCheck } from 'lucide-react-native';
import { NoshSymbol } from '@/components/brand/NoshBrandAssets';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import {
  ELEVENLABS_PRIVACY_URL,
  OPENROUTER_PRIVACY_URL,
  PRIVACY_POLICY_URL,
  SUPADATA_PRIVACY_URL,
} from '@/constants/legal';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { useAuth } from '@/hooks/useAuth';
import {
  grantAiDataConsent,
  loadAiDataConsent,
  withdrawAiDataConsent,
} from '@/utils/privacy/aiDataConsent';
import { Fonts } from '@/utils/fonts';

interface AiDataConsentContextValue {
  isGranted: boolean;
  isReady: boolean;
  requestConsent: () => Promise<boolean>;
  reviewConsent: () => void;
}

const AiDataConsentContext = createContext<AiDataConsentContextValue | null>(null);
const ConsentPromptContext = createContext<{
  prompt: React.ReactNode;
  registerHost: () => () => void;
} | null>(null);

/** Mount inside an already presented native modal so consent is visible above it. */
export function AiDataConsentPromptHost() {
  const context = useContext(ConsentPromptContext);
  if (!context) throw new Error('Consent prompt host requires AiDataConsentProvider');
  const { registerHost, prompt } = context;
  useEffect(() => registerHost(), [registerHost]);
  return <>{prompt}</>;
}


async function openUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Could not open link', 'Please try again when you are online.');
  }
}

export function AiDataConsentProvider({ children }: React.PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id;
  const [isGranted, setIsGranted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sheetMode, setSheetMode] = useState<'request' | 'review' | null>(null);
  const [promptHostCount, setPromptHostCount] = useState(0);
  const registerHost = useCallback(() => {
    setPromptHostCount(count => count + 1);
    return () => setPromptHostCount(count => count - 1);
  }, []);

  const pendingRequest = useRef<Promise<boolean> | null>(null);
  const resolveRequest = useRef<((allowed: boolean) => void) | null>(null);
  const consentState = useRef({ isGranted, isReady });
  consentState.current = { isGranted, isReady };

  useEffect(() => {
    let cancelled = false;
    setIsReady(false);
    setIsGranted(false);
    setIsUpdating(false);
    setSheetMode(null);
    resolveRequest.current?.(false);
    resolveRequest.current = null;
    pendingRequest.current = null;

    if (!userId) {
      setIsReady(true);
      return () => { cancelled = true; };
    }

    loadAiDataConsent(userId)
      .then((record) => {
        if (cancelled) return;
        setIsGranted(Boolean(record));
        setIsReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setIsReady(true);
      });

    return () => { cancelled = true; };
  }, [userId]);

  const finishRequest = useCallback((allowed: boolean) => {
    setSheetMode(null);
    resolveRequest.current?.(allowed);
    resolveRequest.current = null;
    pendingRequest.current = null;
  }, []);

  const requestConsent = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    if (consentState.current.isReady && consentState.current.isGranted) return true;
    const stored = await loadAiDataConsent(userId).catch(() => null);
    if (stored) {
      setIsGranted(true);
      setIsReady(true);
      return true;
    }
    if (pendingRequest.current) return pendingRequest.current;

    setSheetMode('request');
    const request = new Promise<boolean>((resolve) => {
      resolveRequest.current = resolve;
    });
    pendingRequest.current = request;
    return request;
  }, [userId]);

  const allow = useCallback(async () => {
    if (!userId) {
      finishRequest(false);
      return;
    }
    setIsUpdating(true);
    try {
      await grantAiDataConsent(userId);
      setIsGranted(true);
      setIsReady(true);
      finishRequest(true);
    } catch {
      Alert.alert('Could not save permission', 'Please try again.');
    } finally {
      setIsUpdating(false);
    }
  }, [finishRequest, userId]);

  const withdraw = useCallback(async () => {
    if (!userId) return;
    setIsUpdating(true);
    try {
      await withdrawAiDataConsent(userId);
      setIsGranted(false);
      setSheetMode(null);
    } catch {
      Alert.alert('Could not update permission', 'Please try again.');
    } finally {
      setIsUpdating(false);
    }
  }, [userId]);

  const value = useMemo<AiDataConsentContextValue>(() => ({
    isGranted,
    isReady,
    requestConsent,
    reviewConsent: () => setSheetMode('review'),
  }), [isGranted, isReady, requestConsent]);

  const isRequest = sheetMode === 'request';

  const prompt = (
      <Sheet
        visible={sheetMode !== null}
        onClose={() => finishRequest(false)}
        maxHeight="94%"
        closeAccessibilityLabel={isRequest ? 'Not now' : 'Close AI data use'}
        header={
          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <ShieldCheck size={20} color={Colors.onPrimary} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Your choice</Text>
              <Text style={styles.title}>AI data use</Text>
            </View>
          </View>
        }
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.body}>
            Folio uses external services to read recipes, transcribe recipe media, create cookbook pages, and answer cooking questions.
          </Text>
          <View style={styles.disclosureCard}>
            <DisclosureRow
              icon={<NoshSymbol size={22} />}
              text="Recipe links, pasted text, photos, uploaded audio and video, sampled video frames, chat messages, and the active cookbook or recipe context may be sent."
            />
            <DisclosureRow
              icon={<ExternalLink size={18} color={Colors.primary} />}
              text="OpenRouter routes recipe understanding, chat, page design, and audio transcription requests to selected Qwen or speech-to-text model providers."
            />
            <DisclosureRow
              icon={<ExternalLink size={18} color={Colors.primary} />}
              text="Supadata receives supported public social-video links and analyzes available video content for recipe evidence."
            />
            <DisclosureRow
              icon={<ExternalLink size={18} color={Colors.primary} />}
              text="ElevenLabs receives uploaded or directly linked video files to produce speech-to-text when video transcription is available."
            />
          </View>
          <Text style={styles.body}>
            Folio sends only the content needed for the action you request. Provider retention and training rules may differ. Folio does not need this permission for browsing cookbooks, reading saved pages, or managing your account. You can withdraw permission here at any time.
          </Text>
          <View style={styles.linkRow}>
            <Pressable
              onPress={() => { void openUrl(PRIVACY_POLICY_URL); }}
              accessibilityRole="link"
              accessibilityLabel="Open Folio privacy policy"
            >
              <Text style={styles.link}>Folio privacy policy</Text>
            </Pressable>
            <Pressable
              onPress={() => { void openUrl(OPENROUTER_PRIVACY_URL); }}
              accessibilityRole="link"
              accessibilityLabel="Open OpenRouter privacy policy"
            >
              <Text style={styles.link}>OpenRouter privacy</Text>
            </Pressable>
            <Pressable
              onPress={() => { void openUrl(SUPADATA_PRIVACY_URL); }}
              accessibilityRole="link"
              accessibilityLabel="Open Supadata privacy policy"
            >
              <Text style={styles.link}>Supadata privacy</Text>
            </Pressable>
            <Pressable
              onPress={() => { void openUrl(ELEVENLABS_PRIVACY_URL); }}
              accessibilityRole="link"
              accessibilityLabel="Open ElevenLabs privacy policy"
            >
              <Text style={styles.link}>ElevenLabs privacy</Text>
            </Pressable>
          </View>
          {isRequest ? (
            <View style={styles.actions}>
              <Button
                title="Allow AI processing"
                onPress={() => { void allow(); }}
                fullWidth
                loading={isUpdating || !isReady}
                disabled={isUpdating || !isReady}
                testID="allow-ai-data-processing"
              />
              <Button
                title="Not now"
                variant="ghost"
                onPress={() => finishRequest(false)}
                fullWidth
              />
            </View>
          ) : isGranted ? (
            <Button
              title="Withdraw permission"
              variant="outline"
              onPress={() => { void withdraw(); }}
              fullWidth
              loading={isUpdating || !isReady}
              disabled={isUpdating || !isReady}
              testID="withdraw-ai-data-processing"
            />
          ) : (
            <Button
              title="Allow AI processing"
              onPress={() => { void allow(); }}
              fullWidth
              loading={isUpdating || !isReady}
              disabled={isUpdating || !isReady}
              testID="allow-ai-data-processing"
            />
          )}
        </ScrollView>
      </Sheet>
  );
  return (
    <AiDataConsentContext.Provider value={value}>
      <ConsentPromptContext.Provider value={{ prompt, registerHost }}>
        {children}
        {promptHostCount === 0 ? prompt : null}
      </ConsentPromptContext.Provider>
    </AiDataConsentContext.Provider>
  );
}

function DisclosureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.disclosureRow}>
      <View style={styles.disclosureIcon}>{icon}</View>
      <Text style={styles.disclosureText}>{text}</Text>
    </View>
  );
}

export function useAiDataConsent(): AiDataConsentContextValue {
  const value = useContext(AiDataConsentContext);
  if (!value) throw new Error('useAiDataConsent must be used inside AiDataConsentProvider');
  return value;
}

const styles = StyleSheet.create({
  header: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.sm,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.lg,
  },
  content: {
    gap: Spacing.lg,
  },
  scroll: {
    flexShrink: 1,
  },
  body: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight24,
  },
  disclosureCard: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disclosureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  disclosureIcon: {
    width: 24,
    alignItems: 'center',
    paddingTop: 2,
  },
  disclosureText: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight22,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xl,
  },
  link: {
    color: Colors.primary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
    textDecorationLine: 'underline',
  },
  actions: {
    gap: Spacing.sm,
  },
});
