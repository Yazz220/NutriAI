import { isStaleCachedData } from '@/utils/cookbook/cacheStatus';

describe('isStaleCachedData', () => {
  it('only marks existing data stale when its refresh fails', () => {
    expect(isStaleCachedData(new Error('Offline'), undefined)).toBe(false);
    expect(isStaleCachedData(null, [])).toBe(false);
    expect(isStaleCachedData(new Error('Offline'), [])).toBe(true);
    expect(isStaleCachedData(new Error('Offline'), { title: 'My Cookbook' })).toBe(true);
  });
});
