import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class NutritionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for debugging
    console.error('Nutrition Error Boundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <AlertTriangle size={48} color={Colors.warning} style={styles.icon} />
            
            <Text style={styles.title}>Nutrition Tracking Error</Text>
            
            <Text style={styles.message}>
              Something went wrong with the nutrition tracking feature. This might be due to:
            </Text>
            
            <View style={styles.reasonsList}>
              <Text style={styles.reason}>• Invalid nutrition data</Text>
              <Text style={styles.reason}>• Goal calculation error</Text>
              <Text style={styles.reason}>• Data synchronization issue</Text>
            </View>
            
            <View style={styles.actions}>
              <Button
                title="Try Again"
                onPress={this.handleRetry}
                variant="primary"
                style={styles.retryButton}
                icon={<RefreshCw size={16} color={Colors.white} />}
              />
            </View>
            
            {__DEV__ && this.state.error && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Information:</Text>
                <Text style={styles.debugText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.debugText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Hook for handling nutrition-specific errors
export const useNutritionErrorHandler = () => {
  const handleGoalCalculationError = (error: Error, userProfile?: any) => {
    console.error('Goal calculation error:', error);
    
    // Provide specific guidance based on error type
    if (error.message.includes('missing profile data')) {
      return {
        title: 'Profile Incomplete',
        message: 'Please complete your profile (age, weight, height) to calculate nutrition goals.',
        actionable: true,
        action: 'Complete Profile',
      };
    }
    
    if (error.message.includes('invalid values')) {
      return {
        title: 'Invalid Data',
        message: 'Some of your profile data appears to be invalid. Please check and update your information.',
        actionable: true,
        action: 'Update Profile',
      };
    }
    
    return {
      title: 'Calculation Error',
      message: 'Unable to calculate nutrition goals. You can set them manually instead.',
      actionable: true,
      action: 'Set Manual Goals',
    };
  };

  const handleFoodDatabaseError = (error: Error) => {
    console.error('Food database error:', error);
    
    if (error.message.includes('network')) {
      return {
        title: 'Connection Issue',
        message: 'Unable to search foods. Check your internet connection and try again.',
        actionable: true,
        action: 'Retry',
      };
    }
    
    return {
      title: 'Food Search Error',
      message: 'Unable to search for foods. You can still add custom foods manually.',
      actionable: true,
      action: 'Add Custom Food',
    };
  };

  const handleDataSyncError = (error: Error) => {
    console.error('Data sync error:', error);
    
    return {
      title: 'Sync Issue',
      message: 'Your nutrition data couldn\'t be synced. Changes are saved locally and will sync when connection is restored.',
      actionable: false,
    };
  };

  const handleValidationError = (validationResult: { errors: string[]; warnings: string[] }) => {
    const { errors, warnings } = validationResult;
    
    if (errors.length > 0) {
      return {
        title: 'Invalid Input',
        message: errors.join('\n'),
        actionable: true,
        action: 'Fix Errors',
      };
    }
    
    if (warnings.length > 0) {
      return {
        title: 'Input Warning',
        message: warnings.join('\n'),
        actionable: false,
      };
    }
    
    return null;
  };

  return {
    handleGoalCalculationError,
    handleFoodDatabaseError,
    handleDataSyncError,
    handleValidationError,
  };
};

// Component for displaying nutrition-specific error states
interface NutritionErrorStateProps {
  error: {
    title: string;
    message: string;
    actionable: boolean;
    action?: string;
  };
  onRetry?: () => void;
  onAction?: () => void;
}

export const NutritionErrorState: React.FC<NutritionErrorStateProps> = ({
  error,
  onRetry,
  onAction,
}) => {
  return (
    <View style={styles.errorState}>
      <AlertTriangle size={32} color={Colors.warning} style={styles.smallIcon} />
      <Text style={styles.errorTitle}>{error.title}</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      
      <View style={styles.errorActions}>
        {onRetry && (
          <Button
            title="Try Again"
            onPress={onRetry}
            variant="outline"
            size="sm"
            style={styles.errorButton}
          />
        )}
        
        {error.actionable && onAction && error.action && (
          <Button
            title={error.action}
            onPress={onAction}
            variant="primary"
            size="sm"
            style={styles.errorButton}
          />
        )}
      </View>
    </View>
  );
};

// Loading state component for nutrition features
interface NutritionLoadingStateProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

export const NutritionLoadingState: React.FC<NutritionLoadingStateProps> = ({
  message = 'Loading nutrition data...',
  showProgress = false,
  progress = 0,
}) => {
  return (
    <View style={styles.loadingState}>
      <View style={styles.loadingSpinner}>
        {/* You could add an actual spinner component here */}
        <Text style={styles.loadingText}>⏳</Text>
      </View>
      <Text style={styles.loadingMessage}>{message}</Text>
      
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min(100, Math.max(0, progress))}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
      )}
    </View>
  );
};

// Empty state component for nutrition features
interface NutritionEmptyStateProps {
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export const NutritionEmptyState: React.FC<NutritionEmptyStateProps> = ({
  title,
  message,
  actionTitle,
  onAction,
  icon,
}) => {
  return (
    <View style={styles.emptyState}>
      {icon || <Home size={48} color={Colors.lightText} style={styles.icon} />}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      
      {actionTitle && onAction && (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          style={styles.emptyAction}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.background,
  },
  errorCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  icon: {
    marginBottom: Spacing.md,
  },
  smallIcon: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  reasonsList: {
    alignSelf: 'stretch',
    marginBottom: Spacing.lg,
  },
  reason: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    marginBottom: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  retryButton: {
    minWidth: 120,
  },
  debugInfo: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 8,
    alignSelf: 'stretch',
  },
  debugTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  debugText: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    fontFamily: 'monospace',
    marginBottom: Spacing.xs,
  },
  
  // Error state styles
  errorState: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  errorTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  errorActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  errorButton: {
    minWidth: 100,
  },
  
  // Loading state styles
  loadingState: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingSpinner: {
    marginBottom: Spacing.md,
  },
  loadingText: {
    fontSize: 32,
  },
  loadingMessage: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 200,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    minWidth: 35,
    textAlign: 'right',
  },
  
  // Empty state styles
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyMessage: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  emptyAction: {
    minWidth: 150,
  },
});