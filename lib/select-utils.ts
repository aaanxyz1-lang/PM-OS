export const SELECT_UNASSIGNED = 'NONE';

export function normalizeSelectValue(value: string | undefined | null): string | null {
  if (value === '' || value === undefined || value === null) {
    return null;
  }
  if (value === SELECT_UNASSIGNED) {
    return null;
  }
  return value;
}

export function denormalizeSelectValue(value: string | null | undefined): string {
  return value || SELECT_UNASSIGNED;
}
