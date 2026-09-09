import { classifyUrlDocument } from '@/supabase/functions/_shared/urlRecipeAcquisition';

describe('URL recipe acquisition', () => {
  it('does not mistake dormant MediaWiki captcha configuration for an access challenge', () => {
    const html = `
      <html>
        <head><title>Cookbook:Apple Pie I</title></head>
        <body>
          <script>
            window.config = {
              "wgConfirmEditCaptchaNeededForGenericEdit": "hcaptcha",
              "wgConfirmEditForceShowCaptcha": false,
              "wgConfirmEditHCaptchaSiteKey": "public-site-key"
            };
          </script>
          <h1>Apple Pie I</h1>
          <h2>Ingredients</h2>
          <p>8 oz plain flour</p>
          <h2>Method</h2>
          <p>Rub the flour and fat together.</p>
        </body>
      </html>
    `;

    expect(classifyUrlDocument(html)).toBeNull();
  });
});
