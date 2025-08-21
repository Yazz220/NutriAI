import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

class CoachErrorBoundary extends React.Component<Props, { hasError: boolean; error: Error | null }> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
  <View style={styles.errorContainer}>
    <View style={styles.errorContent}>
      <AlertTriangle size={48} color={Colors.warning} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>
        The Coach feature encountered an unexpected error. Please try again.
      </Text>
      {__DEV__ && (
        <Text style={styles.errorDetails}>{error.message}</Text>
      )}
      <TouchableOpacity style={styles.retryButton} onPress={resetError}>
        <RefreshCw size={20} color={Colors.white} />
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = {
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: Spacing.xl,
  },
  errorContent: {
    alignItems: 'center' as const,
    maxWidth: 300,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    textAlign: 'center' as const,
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  errorDetails: {
    fontSize: 12,
    color: Colors.lightText,
    textAlign: 'center' as const,
    marginBottom: Spacing.lg,
    fontFamily: 'monospace',
  },
  retryButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    gap: Spacing.sm,
  },
  retryText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
};

export default CoachErrorBoundary;