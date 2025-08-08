declare module 'react-native-chart-kit' {
  import * as React from 'react';
  import { ViewStyle, StyleProp } from 'react-native';

  export interface ChartConfig {
    backgroundGradientFrom?: string;
    backgroundGradientTo?: string;
    decimalPlaces?: number;
    color?: (opacity?: number) => string;
    labelColor?: (opacity?: number) => string;
    propsForBackgroundLines?: object;
    propsForLabels?: object;
  }

  export interface Dataset { data: number[]; color?: (opacity?: number) => string }

  export interface LineBarData {
    labels: string[];
    datasets: Dataset[];
  }

  export interface PieDataItem {
    name: string;
    population: number;
    color: string;
    legendFontColor?: string;
    legendFontSize?: number;
  }

  export interface BaseChartProps {
    width: number;
    height: number;
    chartConfig: ChartConfig;
    style?: StyleProp<ViewStyle>;
  }

  export class LineChart extends React.Component<BaseChartProps & { data: LineBarData; bezier?: boolean }>{}
  export class BarChart extends React.Component<BaseChartProps & { data: LineBarData; showBarTops?: boolean; withInnerLines?: boolean }>{}
  export class PieChart extends React.Component<BaseChartProps & { data: PieDataItem[]; accessor: 'population'; backgroundColor?: string; hasLegend?: boolean; center?: [number, number] }>{}
}
