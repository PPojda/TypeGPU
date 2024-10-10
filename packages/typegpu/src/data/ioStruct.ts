import {
  type IMeasurer,
  type ISchema,
  type ISerialInput,
  type ISerialOutput,
  MaxValue,
  Measurer,
  type Parsed,
  Schema,
  type UnwrapRecord,
} from 'typed-binary';
import { RecursiveDataTypeError } from '../errors';
import type { TgpuNamable } from '../namable';
import { code } from '../tgpuCode';
import { identifier } from '../tgpuIdentifier';
import type { AnyTgpuData, ResolutionCtx, TgpuData } from '../types';
import alignIO from './alignIO';
import { getAttributesString, isBuiltin } from './attributes';

// ----------
// Public API
// ----------

export interface TgpuIoStruct<
  TProps extends Record<string, AnyTgpuData> = Record<string, AnyTgpuData>,
> extends ISchema<UnwrapRecord<TProps>>,
    TgpuData<UnwrapRecord<TProps>>,
    TgpuNamable {}

export const ioStruct = <
  TProps extends Record<string, AnyTgpuData> = Record<string, AnyTgpuData>,
>(
  properties: TProps,
): TgpuIoStruct<TProps> => new TgpuIoStructImpl(properties);

export function isIoStructSchema<T extends TgpuIoStruct>(
  schema: T | unknown,
): schema is T {
  return schema instanceof TgpuIoStructImpl;
}

// --------------
// Implementation
// --------------

function generateFields(entries: [string, AnyTgpuData][]) {
  let locations = 0;

  return entries.map(([key, field]) => {
    if (isBuiltin(field)) {
      return code`  ${getAttributesString(field)}${key}: ${field},\n`;
    }

    return code`  @location(${locations++}) ${getAttributesString(field)}${key}: ${field},\n`;
  });
}

class TgpuIoStructImpl<
    TProps extends Record<string, AnyTgpuData> = Record<string, AnyTgpuData>,
  >
  extends Schema<UnwrapRecord<TProps>>
  implements TgpuData<UnwrapRecord<TProps>>
{
  private _label: string | undefined;

  public readonly byteAlignment: number;
  public readonly size: number;
  public readonly isLoose = false as const;

  constructor(private readonly _properties: TProps) {
    super();

    this.byteAlignment = Object.values(_properties)
      .map((prop) => prop.byteAlignment)
      .reduce((a, b) => (a > b ? a : b));

    this.size = this.measure(MaxValue).size;
  }

  get label() {
    return this._label;
  }

  $name(label: string) {
    this._label = label;
    return this;
  }

  resolveReferences(): void {
    throw new RecursiveDataTypeError();
  }

  write(output: ISerialOutput, value: Parsed<UnwrapRecord<TProps>>): void {
    alignIO(output, this.byteAlignment);

    for (const [key, property] of Object.entries(this._properties)) {
      alignIO(output, property.byteAlignment);
      property.write(output, value[key]);
    }

    alignIO(output, this.byteAlignment);
  }

  read(input: ISerialInput): Parsed<UnwrapRecord<TProps>> {
    alignIO(input, this.byteAlignment);

    const result: Record<string, unknown> = {};
    for (const [key, property] of Object.entries(this._properties)) {
      alignIO(input, property.byteAlignment);
      result[key] = property.read(input);
    }

    alignIO(input, this.byteAlignment);
    return result as Parsed<UnwrapRecord<TProps>>;
  }

  measure(
    value: MaxValue | Parsed<UnwrapRecord<TProps>>,
    measurer: IMeasurer = new Measurer(),
  ): IMeasurer {
    alignIO(measurer, this.byteAlignment);

    const maxing = value === MaxValue;
    for (const [key, property] of Object.entries(this._properties)) {
      alignIO(measurer, property.byteAlignment);
      property.measure(maxing ? MaxValue : value[key], measurer);
    }

    alignIO(measurer, this.byteAlignment);
    return measurer;
  }

  resolve(ctx: ResolutionCtx): string {
    const ident = identifier().$name(this._label);

    ctx.addDeclaration(code`
struct ${ident} {
${generateFields(Object.entries(this._properties))}\
}
`);

    return ctx.resolve(ident);
  }
}