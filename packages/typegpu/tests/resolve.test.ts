import { parse } from '@typegpu/wgsl-parser';
import { describe, expect, it } from 'vitest';
import * as d from '../src/data';
import tgpu, { type TgpuBufferReadonly, wgsl } from '../src/experimental';
import type { ResolutionCtx } from '../src/experimental';

describe('tgpu resolve', () => {
  it('should resolve a string (identity)', () => {
    const mockCode = 'fn foo() { var v: Gradient; }';
    const resolved = tgpu.resolve(mockCode);
    expect(parse(resolved)).toEqual(parse(mockCode));
  });

  it('should resolve a list of strings', () => {
    const mockCode = [
      'fn foo() { var v: Gradient; }',
      'fn bar() { var v: Particle; }',
    ];
    const resolved = tgpu.resolve(mockCode);
    expect(parse(resolved)).toEqual(
      parse('fn foo() { var v: Gradient; } fn bar() { var v: Particle; }'),
    );
  });

  it('should resolve an external struct', () => {
    const Gradient = d.struct({
      from: d.vec3f,
      to: d.vec3f,
    });
    const resolved = tgpu.resolve('fn foo() { var g: Gradient; }', {
      Gradient,
    });
    expect(parse(resolved)).toEqual(
      parse(
        'struct Gradient { from: vec3f, to: vec3f, } fn foo() { var g: Gradient; }',
      ),
    );
  });

  it('should deduplicate dependencies', () => {
    const intensity = {
      label: 'intensity',

      resolve(ctx: ResolutionCtx) {
        ctx.addDeclaration(
          wgsl`@group(0) @binding(0) var<uniform> intensity_1: f32;`,
        );
        return 'intensity_1';
      },
    } as TgpuBufferReadonly<d.F32>;

    const vec4f_ = d.vec4f;

    const vertex = tgpu
      .vertexFn([], d.vec4f)
      .does(() => {
        const v = intensity.value;
        return vec4f_(v, 0, 0, 1);
      })
      .$name('vertex')
      .$uses({ intensity, vec4f_ });

    const fragment = tgpu
      .fragmentFn([], d.vec4f)
      .does(() => vec4f_(intensity.value, 0, 0, 1))
      .$name('fragment')
      .$uses({ intensity, vec4f_ });

    const resolved = tgpu.resolve([vertex, fragment]);

    expect(parse(resolved)).toEqual(
      parse(
        `@group(0) @binding(0) var<uniform> intensity_1: f32;
        @vertex fn vertex() -> vec4f {
          var v = intensity_1;
          return vec4f(v, 0, 0, 1);
        }
        @fragment fn fragment() -> vec4f {
          return vec4f(intensity_1, 0, 0, 1);
        }`,
      ),
    );
  });
});
