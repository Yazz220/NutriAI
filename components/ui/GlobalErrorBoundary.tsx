import { Radii, Spacing, Typography } from '@/constants/spacing';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { FolioHorizontalLockup } from '@/components/brand/NoshBrandAssets';
import { Colors } from '@/constants/colors';
import { captureError } from '@/utils/analytics';
import { Fonts } from '@/utils/fonts';

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class GlobalErrorBoundary extends React.Component<React.PropsWithChildren<object>, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[GlobalErrorBoundary] Uncaught error:', error, errorInfo);
    captureError(error, { componentStack: errorInfo.componentStack });
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <FolioHorizontalLockup width={136} />
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>Close and reopen Folio. Your cookbooks are safe.</Text>
            {__DEV__ && this.state.error ? (
              <ScrollView style={styles.details}>
                <Text style={styles.errorLabel}>Error</Text>
                <Text style={styles.errorText}>{String(this.state.error?.message || this.state.error)}</Text>
                {this.state.errorInfo?.componentStack ? (
                  <>
                    <Text style={[styles.errorLabel, { marginTop: Spacing.values[12] }]}>Stack</Text>
                    <Text style={styles.stackText}>{this.state.errorInfo.componentStack}</Text>
                  </>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    gap: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    lineHeight: Typography.metrics.lineHeight32,
    fontFamily: Fonts.display.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    textAlign: 'center',
  },
  details: {
    width: '100%',
    maxHeight: 240,
    backgroundColor: Colors.card,
    borderRadius: Radii.numeric[8],
    padding: Spacing.values[12],
    marginTop: Spacing.md,
  },
  errorLabel: {
    color: Colors.warning,
    fontWeight: '600',
    marginBottom: Spacing.values[6],
  },
  errorText: {
    color: Colors.text,
  },
  stackText: {
    marginTop: Spacing.values[8],
    color: Colors.lightText,
    fontSize: Typography.sizes.md,
  },
});
