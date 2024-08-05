/**
 * @module typegpu
 */

export * from './errors';
export * from './types';
export { AsCallable, ICallable } from './callable';
export * from './typegpuRuntime';
export { default as ProgramBuilder, type Program } from './programBuilder';
export { StrictNameRegistry, RandomNameRegistry } from './nameRegistry';

export { default as wgsl } from './wgsl';
export { createRuntime, CreateRuntimeOptions } from './createRuntime';

export type { WgslBuffer } from './wgslBuffer';
export type { WgslCode } from './wgslCode';
export type { WgslConst } from './wgslConstant';
export type { WgslFn } from './wgslFunction';
export type { WgslPlum } from './wgslPlum';
export type { WgslSettable } from './settableTrait';
export type { WgslFn as WgslFnExperimental } from './wgslFunctionExperimental';
export type { WgslVar } from './wgslVariable';