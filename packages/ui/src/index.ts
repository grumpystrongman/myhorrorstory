import { tokens } from '@myhorrorstory/design-tokens';

export function panelStyle(): Record<string, string> {
  return {
    backgroundColor: tokens.color.panel,
    color: tokens.color.textPrimary,
    borderRadius: `${tokens.radius.md}px`,
    padding: `${tokens.spacing.lg}px`
  };
}
