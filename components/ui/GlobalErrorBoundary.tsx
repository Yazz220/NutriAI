import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class GlobalErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Surface errors to Metro logs
    console.error('[GlobalErrorBoundary] Uncaught error:', error, errorInfo);
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
                  <Text style={[styles.errorLabel, { marginTop: 12 }]}>Stack</Text>
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
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#0b0f0e',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e5f9f4',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9fb5af',
    marginBottom: 16,
  },
  details: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 12,
  },
  errorLabel: {
    color: '#b3ffda',
    fontWeight: '600',
    marginBottom: 6,
  },
  errorText: {
    color: '#f6f6f6',
  },
  stackText: {
    marginTop: 8,
    color: '#cbd5d1',
    fontSize: 12,
  },
});
