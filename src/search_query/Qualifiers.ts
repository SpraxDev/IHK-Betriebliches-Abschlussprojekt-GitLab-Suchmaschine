export type QualifierInfo = {
  databaseField: string;
  prepareValue: (value: string) => string;
  prepareForLike: (likeEscaped: string) => string;
}

export const QUALIFIERS: { [qualifierKey: string]: QualifierInfo } = {
  namespace: {
    databaseField: 'repositories.full_name',
    prepareValue: defaultPrepareValue,
    prepareForLike: defaultPrepareForLike
  },
  path: {
    databaseField: 'repository_files.file_path',
    prepareValue: defaultPrepareValue,
    prepareForLike: defaultPrepareForLike
  },
  filename: {
    databaseField: 'repository_files.file_name',
    prepareValue: defaultPrepareValue,
    prepareForLike: defaultPrepareForLike
  },
  extension: {
    databaseField: 'repository_files.file_name',
    prepareValue: (value: string) => value.startsWith('.') ? value : `.${value}`,
    prepareForLike: (likeEscaped: string) => `%${likeEscaped}`
  }
};

function defaultPrepareValue(value: string): string {
  return value;
}

function defaultPrepareForLike(likeEscaped: string): string {
  return `%${likeEscaped}%`;
}
