import type { BrandingInput } from '../types';

/** The fonts offered by name. Each is a stack the API accepts (letters, digits, spaces, commas, hyphens and single quotes only). */
export const FONT_PRESETS: Array<{ label: string; value: string }> = [
  { label: 'System (default)', value: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Helvetica', value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Trebuchet', value: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Georgia (serif)', value: 'Georgia, Times, serif' },
  { label: 'Times (serif)', value: "'Times New Roman', Times, serif" },
];

const HEX = /^#[0-9a-fA-F]{6}$/;
const FONT = /^[A-Za-z0-9 ,'-]{1,200}$/;

export type BrandingErrors = Partial<Record<keyof BrandingInput, string>>;

/**
 * The same rules the API enforces, so a mistake is shown beside its field before anything is sent. The API still checks everything:
 * this is for the person typing, not for safety.
 */
export function validateBranding(input: BrandingInput): BrandingErrors {
  const errors: BrandingErrors = {};
  if (!input.productName.trim() || input.productName.length > 60) errors.productName = 'Enter a name of 1 to 60 characters.';
  if (input.logoUrl && !/^https:\/\/\S+$/.test(input.logoUrl)) errors.logoUrl = 'Use a full https:// address, or leave it empty to show the name.';
  if (input.logoUrl && input.logoUrl.length > 2048) errors.logoUrl = 'That address is too long.';
  for (const field of ['accentColor', 'textColor', 'backgroundColor'] as const) {
    if (!HEX.test(input[field])) errors[field] = 'Use a colour like #4f46e5.';
  }
  if (!FONT.test(input.fontFamily)) errors.fontFamily = 'Use letters, numbers, spaces, commas, hyphens and single quotes only.';
  if (input.headerTagline.length > 300) errors.headerTagline = 'At most 300 characters.';
  if (input.footerLines.length > 6) errors.footerLines = 'At most 6 lines.';
  else if (input.footerLines.some((line) => line.length > 300)) errors.footerLines = 'Each line is at most 300 characters.';
  return errors;
}

/** The footer box holds one line per row; empty rows are dropped. */
export const footerFromText = (text: string): string[] => text.split('\n').map((line) => line.trim()).filter(Boolean);
