import { listCookbookCreationStyles } from '@/constants/cookbookStyles';

describe('cookbook creation styles', () => {
  it('offers only the signature cookbook while the book experience is being perfected', () => {
    const styles = listCookbookCreationStyles();

    expect(styles.map((style) => style.id)).toEqual(['handwritten']);
    expect(styles.map((style) => style.name)).toEqual(['Garden Table']);
  });
});
