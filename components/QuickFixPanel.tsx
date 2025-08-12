/**
 * Quick-fix review panel for recipe import corrections
 * Provides one-tap fixes for common recipe extraction issues
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Card } from '@/components/ui/Card';
import { 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Plus, 
  Edit3, 
  Trash2,
  Zap,
  Clock,
  Users,
  ChefHat
} from 'lucide-react-native';

export interface QuickFixAction {
  id: string;
  type: 'add_ingredient' | 'fix_quantity' | 'mark_optional' | 'remove_ingredient' | 'fix_instruction' | 'add_time' | 'fix_servings';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  autoFix: boolean;
  data: any;
}

export interface QuickFixPanelProps {
  actions: QuickFixAction[];
  onApplyFix: (actionId: string, data?: any) => void;
  onApplyAllFixes: () => void;
  onDismiss: (actionId: string) => void;
  visible: boolean;
}

export const QuickFixPanel: React.FC<QuickFixPanelProps> = ({
  actions,
  onApplyFix,
  onApplyAllFixes,
  onDismiss,
  visible
}) => {
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});

  if (!visible || actions.length === 0) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return Colors.error;
      case 'medium': return Colors.warning;
      case 'low': return Colors.info;
      default: return Colors.lightText;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return AlertCircle;
      case 'medium': return AlertTriangle;
      case 'low': return CheckCircle;
      default: return CheckCircle;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'add_ingredient': return Plus;
      case 'fix_quantity': return Edit3;
      case 'mark_optional': return CheckCircle;
      case 'remove_ingredient': return Trash2;
      case 'fix_instruction': return Edit3;
      case 'add_time': return Clock;
      case 'fix_servings': return Users;
      default: return Zap;
    }
  };

  const toggleExpanded = (actionId: string) => {
    const newExpanded = new Set(expandedActions);
    if (newExpanded.has(actionId)) {
      newExpanded.delete(actionId);
    } else {
      newExpanded.add(actionId);
    }
    setExpandedActions(newExpanded);
  };

  const handleApplyFix = (action: QuickFixAction) => {
    if (action.autoFix) {
      onApplyFix(action.id, action.data);
    } else {
      // Show expanded form for manual input
      toggleExpanded(action.id);
    }
  };

  const handleManualFix = (action: QuickFixAction) => {
    const editedData = editingValues[action.id] || action.data;
    onApplyFix(action.id, editedData);
    
    // Collapse the expanded form
    const newExpanded = new Set(expandedActions);
    newExpanded.delete(action.id);
    setExpandedActions(newExpanded);
  };

  const updateEditingValue = (actionId: string, field: string, value: any) => {
    setEditingValues(prev => ({
      ...prev,
      [actionId]: {
        ...prev[actionId],
        [field]: value
      }
    }));
  };

  const renderExpandedForm = (action: QuickFixAction) => {
    const isExpanded = expandedActions.has(action.id);
    if (!isExpanded) return null;

    const editData = editingValues[action.id] || action.data;

    switch (action.type) {
      case 'add_ingredient':
        return (
          <View style={styles.expandedForm}>
            <Text style={styles.formLabel}>Ingredient Name</Text>
            <TextInput
              style={styles.formInput}
              value={editData.name || ''}
              onChangeText={(text) => updateEditingValue(action.id, 'name', text)}
              placeholder="Enter ingredient name"
            />
            
            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Quantity</Text>
                <TextInput
                  style={styles.formInput}
                  value={editData.quantity?.toString() || ''}
                  onChangeText={(text) => updateEditingValue(action.id, 'quantity', parseFloat(text) || undefined)}
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Unit</Text>
                <TextInput
                  style={styles.formInput}
                  value={editData.unit || ''}
                  onChangeText={(text) => updateEditingValue(action.id, 'unit', text)}
                  placeholder="cup"
                />
              </View>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity 
                style={[styles.formButton, styles.cancelButton]}
                onPress={() => toggleExpanded(action.id)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.formButton, styles.applyButton]}
                onPress={() => handleManualFix(action)}
              >
                <Text style={styles.applyButtonText}>Add Ingredient</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'fix_quantity':
        return (
          <View style={styles.expandedForm}>
            <Text style={styles.formLabel}>
              Fix quantity for "{editData.ingredientName}"
            </Text>
            
            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Quantity</Text>
                <TextInput
                  style={styles.formInput}
                  value={editData.newQuantity?.toString() || ''}
                  onChangeText={(text) => updateEditingValue(action.id, 'newQuantity', parseFloat(text) || undefined)}
                  placeholder="Enter quantity"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Unit</Text>
                <TextInput
                  style={styles.formInput}
                  value={editData.newUnit || ''}
                  onChangeText={(text) => updateEditingValue(action.id, 'newUnit', text)}
                  placeholder="cup"
                />
              </View>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity 
                style={[styles.formButton, styles.cancelButton]}
                onPress={() => toggleExpanded(action.id)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.formButton, styles.applyButton]}
                onPress={() => handleManualFix(action)}
              >
                <Text style={styles.applyButtonText}>Update Quantity</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'add_time':
        return (
          <View style={styles.expandedForm}>
            <Text style={styles.formLabel}>Add Missing Time Information</Text>
            
            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Prep Time (min)</Text>
                <TextInput
                  style={styles.formInput}
                  value={editData.prepTime?.toString() || ''}
                  onChangeText={(text) => updateEditingValue(action.id, 'prepTime', parseInt(text) || undefined)}
                  placeholder="15"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Cook Time (min)</Text>
                <TextInput
                  style={styles.formInput}
                  value={editData.cookTime?.toString() || ''}
                  onChangeText={(text) => updateEditingValue(action.id, 'cookTime', parseInt(text) || undefined)}
                  placeholder="30"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity 
                style={[styles.formButton, styles.cancelButton]}
                onPress={() => toggleExpanded(action.id)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.formButton, styles.applyButton]}
                onPress={() => handleManualFix(action)}
              >
                <Text style={styles.applyButtonText}>Add Times</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'fix_servings':
        return (
          <View style={styles.expandedForm}>
            <Text style={styles.formLabel}>Set Number of Servings</Text>
            
            <TextInput
              style={styles.formInput}
              value={editData.servings?.toString() || ''}
              onChangeText={(text) => updateEditingValue(action.id, 'servings', parseInt(text) || undefined)}
              placeholder="4"
              keyboardType="numeric"
            />

            <View style={styles.formActions}>
              <TouchableOpacity 
                style={[styles.formButton, styles.cancelButton]}
                onPress={() => toggleExpanded(action.id)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.formButton, styles.applyButton]}
                onPress={() => handleManualFix(action)}
              >
                <Text style={styles.applyButtonText}>Update Servings</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'fix_instruction':
        return (
          <View style={styles.expandedForm}>
            <Text style={styles.formLabel}>
              Edit Step {editData.stepNumber}
            </Text>
            
            <TextInput
              style={[styles.formInput, styles.multilineInput]}
              value={editData.newText || ''}
              onChangeText={(text) => updateEditingValue(action.id, 'newText', text)}
              placeholder="Enter instruction text"
              multiline
              numberOfLines={3}
            />

            <View style={styles.formActions}>
              <TouchableOpacity 
                style={[styles.formButton, styles.cancelButton]}
                onPress={() => toggleExpanded(action.id)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.formButton, styles.applyButton]}
                onPress={() => handleManualFix(action)}
              >
                <Text style={styles.applyButtonText}>Update Step</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const renderActionItem = (action: QuickFixAction) => {
    const IconComponent = getActionIcon(action.type);
    const SeverityIcon = getSeverityIcon(action.severity);
    const severityColor = getSeverityColor(action.severity);
    const isExpanded = expandedActions.has(action.id);

    return (
      <Card key={action.id} style={[styles.actionCard, { borderLeftColor: severityColor }]}>
        <TouchableOpacity 
          style={styles.actionHeader}
          onPress={() => action.autoFix ? handleApplyFix(action) : toggleExpanded(action.id)}
        >
          <View style={styles.actionIcon}>
            <IconComponent size={20} color={Colors.primary} />
          </View>
          
          <View style={styles.actionContent}>
            <View style={styles.actionTitleRow}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <SeverityIcon size={16} color={severityColor} />
            </View>
            <Text style={styles.actionDescription}>{action.description}</Text>
          </View>

          <View style={styles.actionButtons}>
            {action.autoFix ? (
              <TouchableOpacity 
                style={styles.quickFixButton}
                onPress={() => handleApplyFix(action)}
              >
                <Zap size={16} color={Colors.white} />
                <Text style={styles.quickFixText}>Fix</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => toggleExpanded(action.id)}
              >
                <Edit3 size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.dismissButton}
              onPress={() => onDismiss(action.id)}
            >
              <Text style={styles.dismissText}>×</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {renderExpandedForm(action)}
      </Card>
    );
  };

  const highPriorityActions = actions.filter(a => a.severity === 'high');
  const mediumPriorityActions = actions.filter(a => a.severity === 'medium');
  const lowPriorityActions = actions.filter(a => a.severity === 'low');

  const autoFixableCount = actions.filter(a => a.autoFix).length;

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AlertTriangle size={20} color={Colors.warning} />
          <Text style={styles.headerTitle}>Quick Fixes ({actions.length})</Text>
        </View>
        
        {autoFixableCount > 0 && (
          <TouchableOpacity 
            style={styles.fixAllButton}
            onPress={onApplyAllFixes}
          >
            <Zap size={16} color={Colors.white} />
            <Text style={styles.fixAllText}>Fix All ({autoFixableCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.actionsList} nestedScrollEnabled>
        {/* High Priority Actions */}
        {highPriorityActions.length > 0 && (
          <View style={styles.prioritySection}>
            <Text style={styles.priorityTitle}>High Priority</Text>
            {highPriorityActions.map(renderActionItem)}
          </View>
        )}

        {/* Medium Priority Actions */}
        {mediumPriorityActions.length > 0 && (
          <View style={styles.prioritySection}>
            <Text style={styles.priorityTitle}>Medium Priority</Text>
            {mediumPriorityActions.map(renderActionItem)}
          </View>
        )}

        {/* Low Priority Actions */}
        {lowPriorityActions.length > 0 && (
          <View style={styles.prioritySection}>
            <Text style={styles.priorityTitle}>Low Priority</Text>
            {lowPriorityActions.map(renderActionItem)}
          </View>
        )}
      </ScrollView>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 400,
    marginBottom: Spacing.lg
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.sm
  },
  fixAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 6
  },
  fixAllText: {
    color: Colors.white,
    fontWeight: '600',
    marginLeft: Spacing.xs
  },
  actionsList: {
    maxHeight: 300
  },
  prioritySection: {
    marginBottom: Spacing.lg
  },
  priorityTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm
  },
  actionCard: {
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    backgroundColor: Colors.white
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md
  },
  actionContent: {
    flex: 1
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs
  },
  actionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    flex: 1
  },
  actionDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    lineHeight: 18
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  quickFixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 4,
    marginRight: Spacing.sm
  },
  quickFixText: {
    color: Colors.white,
    fontWeight: '600',
    marginLeft: Spacing.xs,
    fontSize: Typography.sizes.sm
  },
  editButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm
  },
  dismissButton: {
    padding: Spacing.sm
  },
  dismissText: {
    fontSize: 20,
    color: Colors.lightText,
    fontWeight: '300'
  },
  expandedForm: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  formLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs
  },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: Spacing.sm,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    marginBottom: Spacing.sm
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm
  },
  formColumn: {
    flex: 1,
    marginRight: Spacing.sm
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md
  },
  formButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 6,
    marginLeft: Spacing.sm
  },
  cancelButton: {
    backgroundColor: Colors.border
  },
  cancelButtonText: {
    color: Colors.text,
    fontWeight: '500'
  },
  applyButton: {
    backgroundColor: Colors.primary
  },
  applyButtonText: {
    color: Colors.white,
    fontWeight: '600'
  }
});

export default QuickFixPanel;