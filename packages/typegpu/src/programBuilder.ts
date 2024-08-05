import { type NameRegistry, RandomNameRegistry } from './nameRegistry';
import { ResolutionCtxImpl } from './resolutionCtx';
import type { TypeGpuRuntime } from './typegpuRuntime';
import type { BufferUsage, WgslResolvable } from './types';

export type Program = {
  readonly bindGroupLayout: GPUBindGroupLayout;
  readonly bindGroup: GPUBindGroup;
  readonly code: string;
};

type BuildOptions = {
  shaderStage: number;
  bindingGroup: number;
  nameRegistry?: NameRegistry;
};

const usageToBindingTypeMap: Record<BufferUsage, GPUBufferBindingType> = {
  uniform: 'uniform',
  mutable_storage: 'storage',
  readonly_storage: 'read-only-storage',
};

export default class ProgramBuilder {
  constructor(
    private runtime: TypeGpuRuntime,
    private root: WgslResolvable,
  ) {}

  build(options: BuildOptions): Program {
    const ctx = new ResolutionCtxImpl({
      names: options.nameRegistry ?? new RandomNameRegistry(),
      bindingGroup: options.bindingGroup,
    });

    // Resolving code
    const codeString = ctx.resolve(this.root);
    const usedBindables = Array.from(ctx.usedBindables);

    const bindGroupLayout = this.runtime.device.createBindGroupLayout({
      entries: usedBindables.map((bindable, idx) => ({
        binding: idx,
        visibility: options.shaderStage,
        buffer: {
          type: usageToBindingTypeMap[bindable.usage],
        },
      })),
    });

    const bindGroup = this.runtime.device.createBindGroup({
      layout: bindGroupLayout,
      entries: usedBindables.map((bindable, idx) => ({
        binding: idx,
        resource: {
          buffer: this.runtime.bufferFor(bindable.allocatable),
        },
      })),
    });

    return {
      bindGroupLayout,
      bindGroup,
      code: codeString,
    };
  }
}