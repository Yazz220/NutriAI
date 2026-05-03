import React from 'react';
import { Redirect } from 'expo-router';

export default function LegacyPlanRedirect() {
  return <Redirect href="/(book)" />;
}
