import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '..');

function readTemplate(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Folio email templates', () => {
  const confirmation = readTemplate('supabase/templates/confirm-sign-up.html');
  const plusWelcome = readTemplate('emails/folio-plus-welcome.html');

  it.each([
    ['confirmation', confirmation],
    ['Plus welcome', plusWelcome],
  ])('%s remains portable and launch-branded', (_name, template) => {
    expect(Buffer.byteLength(template, 'utf8')).toBeLessThan(102 * 1024);
    expect(template).toContain('folio.cookbook.help@outlook.com');
    expect(template).toContain('#65436f');
    expect(template).toContain('Folio');
    expect(template).not.toMatch(/<script\b/i);
    expect(template).not.toMatch(/<img\b/i);
    expect(template).not.toMatch(/\bNosh\b/);
  });

  it('keeps the Supabase confirmation URL intact in the CTA and fallback link', () => {
    expect(confirmation.match(/{{ \.ConfirmationURL }}/g)).toHaveLength(3);
  });

  it('states the current Plus allowance and Apple billing ownership', () => {
    expect(plusWelcome).toContain('40 beautifully designed recipe pages each month');
    expect(plusWelcome).toContain('Apple manages your payment, renewal, and receipt.');
    expect(plusWelcome).toContain('https://apps.apple.com/account/subscriptions');
  });
});
