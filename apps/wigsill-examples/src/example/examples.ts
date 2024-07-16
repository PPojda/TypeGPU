import { mapKeys, mapValues, pipe } from 'remeda';
import { parseExampleCode } from './parseExampleCode';

const rawExamples: Record<string, string> = import.meta.glob(
  '../../examples/**/*.js',
  {
    query: 'raw',
    eager: true,
    import: 'default',
  },
);

export const examples = pipe(
  rawExamples,
  mapKeys((key) =>
    pipe(
      key,
      (key) => key.replace(/^..\/..\/examples\//, ''), // remove parent folder
      (key) => key.replace(/.js$/, ''), // remove extension
      (key) => key.replace(/\//, '--'), // / -> --
    ),
  ),
  mapValues(parseExampleCode),
);