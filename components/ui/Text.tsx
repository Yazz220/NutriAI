import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { Typography } from '@/constants/typography';
import { Colors } from '@/constants/colors';

type TextVariant = keyof typeof Typography;

type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: string;
  children?: React.ReactNode;
  style?: any;
};

export const Text = ({
  variant = 'body',
  color = Colors.text,
  children,
  style,
  ...props
}: TextProps) => {
  const textStyle = StyleSheet.flatten([
    Typography[variant],
    { color },
    style,
  ]);

  return (
    <RNText style={textStyle} {...props}>
      {children}
    </RNText>
  );
};

export const H1 = (props: TextProps) => <Text variant="h1" {...props} />;
export const H2 = (props: TextProps) => <Text variant="h2" {...props} />;
export const H3 = (props: TextProps) => <Text variant="h3" {...props} />;
export const Body = (props: TextProps) => <Text variant="body" {...props} />;
export const BodyBold = (props: TextProps) => <Text variant="bodyBold" {...props} />;
export const BodySmall = (props: TextProps) => <Text variant="bodySmall" {...props} />;
export const ButtonText = (props: TextProps) => <Text variant="button" {...props} />;
export const Caption = (props: TextProps) => <Text variant="caption" {...props} />;
