import React from 'react';
import { render } from '@testing-library/react-native';
import { CompactNutritionRings } from '../CompactNutritionRings';
import { DailyProgress } from '@/hooks/useNutrition';

const mockDailyProgress: DailyProgress = {
  status: 'under',
  calories: {
    consumed: 1200,
    goal: 2000,
    remaining: 800,
    fromPlanned: 600,
    fromLogged: 600,
  },
  macros: {
    protein: {
      consumed: 80,
      goal: 150,
      percentage: 0.53,
    },
    carbs: {
      consumed: 120,
      goal: 250,
      percentage: 0.48,
    },
    fats: {
      consumed: 45,
      goal: 67,
      percentage: 0.67,
    },
  },
};

describe('CompactNutritionRings', () => {
  it('renders without crashing', () => {
    const { getByText } = render(
      <CompactNutritionRings 
        dailyProgress={mockDailyProgress}
        isLoading={false}
      />
    );
    
    // Should show the remaining calories
    expect(getByText('800')).toBeTruthy();
    expect(getByText('kcal')).toBeTruthy();
    
    // Should show macro values
    expect(getByText('80')).toBeTruthy(); // Protein
    expect(getByText('120')).toBeTruthy(); // Carbs  
    expect(getByText('45')).toBeTruthy(); // Fats
    
    // Should show macro labels
    expect(getByText('Protein')).toBeTruthy();
    expect(getByText('Fat')).toBeTruthy();
    expect(getByText('Carbs')).toBeTruthy();
  });

  it('shows loading state', () => {
    const { getByText } = render(
      <CompactNutritionRings 
        dailyProgress={mockDailyProgress}
        isLoading={true}
      />
    );
    
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('handles over goal scenario', () => {
    const overGoalProgress: DailyProgress = {
      ...mockDailyProgress,
      status: 'over',
      calories: {
        ...mockDailyProgress.calories,
        consumed: 2200,
        remaining: -200,
      },
    };

    const { getByText } = render(
      <CompactNutritionRings 
        dailyProgress={overGoalProgress}
        isLoading={false}
      />
    );
    
    // Should show calories over goal
    expect(getByText('200')).toBeTruthy();
  });
});