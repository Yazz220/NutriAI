import { Radii, Typography , Spacing} from '@/constants/spacing';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>An unexpected error occurred. Check the console for details.</Text>
          {this.state.error && (
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
          )}
        </View>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.values[16],
    paddingTop: Spacing.values[60],
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    lineHeight: Typography.metrics.lineHeight32,
    fontFamily: Fonts.display.bold,
    color: Colors.text,
    marginBottom: Spacing.values[8],
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    marginBottom: Spacing.values[16],
  },
  details: {
    backgroundColor: Colors.card,
    borderRadius: Radii.numeric[8],
    padding: Spacing.values[12],
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
