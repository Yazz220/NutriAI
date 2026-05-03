import React from 'react';
import { Redirect } from 'expo-router';

export default function LegacyRecipesRedirect() {
  return <Redirect href="/(book)" />;
}
