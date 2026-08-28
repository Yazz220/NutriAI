import { Image } from 'react-native';
import { resolveImageAssetUri } from '@/utils/cookbook/imageAsset';

describe('cookbook image asset resolution', () => {
  afterEach(() => jest.restoreAllMocks());

  it('uses the React Native asset registry for bundled images', () => {
    const resolver = jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({
      uri: '/assets/cookbook-page.png',
      width: 1536,
      height: 2048,
      scale: 1,
    });

    expect(resolveImageAssetUri(42)).toBe('/assets/cookbook-page.png');
    expect(resolver).toHaveBeenCalledWith(42);
  });

  it('accepts direct and array-wrapped image sources', () => {
    expect(resolveImageAssetUri({ uri: 'https://example.com/page.png' })).toBe(
      'https://example.com/page.png',
    );
    expect(resolveImageAssetUri([{ uri: 'file:///page.png' }])).toBe('file:///page.png');
    expect(resolveImageAssetUri(undefined)).toBeNull();
  });
});
