describe('CookbookPageImage native compatibility', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('expo-image');
    jest.dontMock('expo-modules-core');
  });

  it('loads when an older development binary does not contain ExpoImage', () => {
    jest.doMock('expo-modules-core', () => ({
      requireOptionalNativeModule: jest.fn(() => null),
    }));
    jest.doMock('expo-image', () => {
      throw new Error("Cannot find native module 'ExpoImage'");
    });

    expect(() => {
      jest.isolateModules(() => {
        require('@/components/cookbook/CookbookPageImage');
      });
    }).not.toThrow();
  });
});
