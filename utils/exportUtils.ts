import { Alert } from 'react-native';

export interface ExportData {
  type: 'calories' | 'weight' | 'macros' | 'adherence';
  timeRange: string;
  data: any[];
  summary: {
    totalEntries: number;
    averageValue: number;
    trend: number;
    dateRange: string;
  };
}

export const exportToCSV = async (exportData: ExportData): Promise<void> => {
  try {
    let csvContent = '';
    
    // Add header with metadata
    csvContent += `# Nosh Export Report\n`;
    csvContent += `# Data Type: ${exportData.type}\n`;
    csvContent += `# Time Range: ${exportData.timeRange}\n`;
    csvContent += `# Date Range: ${exportData.summary.dateRange}\n`;
    csvContent += `# Total Entries: ${exportData.summary.totalEntries}\n`;
    csvContent += `# Average Value: ${exportData.summary.averageValue}\n`;
    csvContent += `# Trend: ${exportData.summary.trend > 0 ? '+' : ''}${exportData.summary.trend.toFixed(2)}%\n`;
    csvContent += `# Generated: ${new Date().toISOString()}\n\n`;

    // Add column headers based on data type
    switch (exportData.type) {
      case 'calories':
        csvContent += 'Date,Consumed,Goal,Adherence%\n';
        exportData.data.forEach(item => {
          csvContent += `${item.date},${item.consumed},${item.goal},${item.adherence.toFixed(1)}\n`;
        });
        break;
      
      case 'weight':
        csvContent += 'Date,Weight (kg),Notes\n';
        exportData.data.forEach(item => {
          csvContent += `${item.date},${item.weight},${item.notes || ''}\n`;
        });
        break;
      
      case 'macros':
        csvContent += 'Date,Protein (g),Carbs (g),Fats (g),Total Calories\n';
        exportData.data.forEach(item => {
          csvContent += `${item.date},${item.protein},${item.carbs},${item.fats},${item.totalCalories}\n`;
        });
        break;
      
      case 'adherence':
        csvContent += 'Date,Calories %,Protein %,Carbs %,Fats %,Overall %\n';
        exportData.data.forEach(item => {
          csvContent += `${item.date},${item.calories.toFixed(1)},${item.protein.toFixed(1)},${item.carbs.toFixed(1)},${item.fats.toFixed(1)},${item.overall.toFixed(1)}\n`;
        });
        break;
    }

    // Show export data in alert for now (can be enhanced later with proper file export)
    Alert.alert(
      'Export Data',
      `Your ${exportData.type} data for ${exportData.timeRange} is ready.\n\nSummary:\n• ${exportData.summary.totalEntries} entries\n• Average: ${exportData.summary.averageValue}\n• Trend: ${exportData.summary.trend.toFixed(1)}%`,
      [
        { text: 'Copy Data', onPress: () => {
          // In a real implementation, you could copy to clipboard
          console.log('CSV Data:', csvContent);
        }},
        { text: 'OK' }
      ]
    );
  } catch (error) {
    console.error('Export error:', error);
    Alert.alert(
      'Export Failed',
      'Unable to export data. Please try again.',
      [{ text: 'OK' }]
    );
  }
};

export const generateInsightsReport = (exportData: ExportData): string => {
  const { data, summary, type } = exportData;
  
  let insights = `# Nosh Insights Report\n\n`;
  insights += `**Data Type:** ${type.charAt(0).toUpperCase() + type.slice(1)}\n`;
  insights += `**Period:** ${summary.dateRange}\n`;
  insights += `**Total Entries:** ${summary.totalEntries}\n\n`;

  switch (type) {
    case 'calories':
      insights += `## Calorie Analysis\n`;
      insights += `- **Average Daily Intake:** ${summary.averageValue} calories\n`;
      insights += `- **Trend:** ${summary.trend > 0 ? 'Increasing' : summary.trend < 0 ? 'Decreasing' : 'Stable'} (${summary.trend.toFixed(1)}%)\n`;
      break;

    case 'weight':
      insights += `## Weight Analysis\n`;
      insights += `- **Average Weight:** ${summary.averageValue.toFixed(1)} kg\n`;
      insights += `- **Trend:** ${summary.trend > 0 ? 'Gaining' : summary.trend < 0 ? 'Losing' : 'Maintaining'} (${summary.trend.toFixed(1)}%)\n`;
      break;

    case 'adherence':
      insights += `## Goal Adherence Analysis\n`;
      insights += `- **Overall Adherence:** ${summary.averageValue.toFixed(1)}%\n`;
      break;
  }

  insights += `\n## Recommendations\n`;
  insights += `- Continue tracking regularly for better insights.\n`;
  insights += `- Consider setting weekly reviews to adjust your approach.\n`;

  return insights;
};
