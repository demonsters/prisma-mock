/// <reference types="jest" />
import { MatchersOrLiterals } from './Matchers';
import { DeepPartial } from 'ts-essentials';
declare type ProxiedProperty = string | number | symbol;
export interface GlobalConfig {
    ignoreProps?: ProxiedProperty[];
}
export declare const JestMockExtended: {
    DEFAULT_CONFIG: GlobalConfig;
    configure: (config: GlobalConfig) => void;
    resetConfig: () => void;
};
export interface CalledWithMock<T, Y extends any[]> extends jest.Mock<T, Y> {
    calledWith: (...args: Y | MatchersOrLiterals<Y>) => jest.Mock<T, Y>;
}
export declare type MockProxy<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer B ? CalledWithMock<B, A> : T[K];
} & T;
export declare type DeepMockProxy<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer B ? CalledWithMock<B, A> & DeepMockProxy<T[K]> : DeepMockProxy<T[K]>;
} & T;
export interface MockOpts {
    deep?: boolean;
}
export declare const mockClear: (mock: MockProxy<any>) => any;
export declare const mockReset: (mock: MockProxy<any>) => any;
export declare const mockDeep: <T>(mockImplementation?: DeepPartial<T> | undefined) => { [K in keyof T]: T[K] extends (...args: infer A) => infer B ? CalledWithMock<B, A> & { [K_1 in keyof T[K]]: T[K][K_1] extends (...args: infer A) => infer B ? CalledWithMock<B, A> & { [K_2 in keyof T[K][K_1]]: T[K][K_1][K_2] extends (...args: infer A) => infer B ? CalledWithMock<B, A> & { [K_3 in keyof T[K][K_1][K_2]]: T[K][K_1][K_2][K_3] extends (...args: infer A) => infer B ? CalledWithMock<B, A> & { [K_4 in keyof T[K][K_1][K_2][K_3]]: T[K][K_1][K_2][K_3][K_4] extends (...args: infer A) => infer B ? CalledWithMock<B, A> & { [K_5 in keyof T[K][K_1][K_2][K_3][K_4]]: T[K][K_1][K_2][K_3][K_4][K_5] extends (...args: infer A) => infer B ? CalledWithMock<B, A> & { [K_6 in keyof T[K][K_1][K_2][K_3][K_4][K_5]]: T[K][K_1][K_2][K_3][K_4][K_5][K_6] extends (...args: infer A) => infer B ? CalledWithMock<B, A> & { [K_7 in keyof T[K][K_1][K_2][K_3][K_4][K_5][K_6]]: T[K][K_1][K_2][K_3][K_4][K_5][K_6][K_7] extends (...args: infer A) => infer B ? CalledWithMock<B, A> & { [K_8 in keyof T[K][K_1][K_2][K_3][K_4][K_5][K_6][K_7]]: T[K][K_1][K_2][K_3][K_4][K_5][K_6][K_7][K_8] extends (...args: infer A) => infer B ? CalledWithMock<B, A> & { [K_9 in keyof T[K][K_1][K_2][K_3][K_4][K_5][K_6][K_7][K_8]]: T[K][K_1][K_2][K_3][K_4][K_5][K_6][K_7][K_8][K_9] extends (...args: infer A) => infer B ? CalledWithMock<B, A> & { [K_10 in keyof T[K][K_1][K_2][K_3][K_4][K_5][K_6][K_7][K_8][K_9]]: T[K][K_1][K_2][K_3][K_4][K_5][K_6][K_7][K_8][K_9][K_10] extends (...args: infer A) => infer B ? CalledWithMock<B, A> & any & T[K][K_1][K_2][K_3][K_4][K_5][K_6][K_7][K_8][K_9][K_10] : DeepMockProxy<T[K][K_1][K_2][K_3][K_4][K_5][K_6][K_7][K_8][K_9][K_10]>; } & T[K][K_1][K_2][K_3][K_4][K_5][K_6][K_7][K_8][K_9] : DeepMockProxy<T[K][K_1][K_2][K_3][K_4][K_5][K_6][K_7][K_8][K_9]>; } & T[K][K_1][K_2][K_3][K_4][K_5][K_6][K_7][K_8] : DeepMockProxy<T[K][K_1][K_2][K_3][K_4][K_5][K_6][K_7][K_8]>; } & T[K][K_1][K_2][K_3][K_4][K_5][K_6][K_7] : DeepMockProxy<T[K][K_1][K_2][K_3][K_4][K_5][K_6][K_7]>; } & T[K][K_1][K_2][K_3][K_4][K_5][K_6] : DeepMockProxy<T[K][K_1][K_2][K_3][K_4][K_5][K_6]>; } & T[K][K_1][K_2][K_3][K_4][K_5] : DeepMockProxy<T[K][K_1][K_2][K_3][K_4][K_5]>; } & T[K][K_1][K_2][K_3][K_4] : DeepMockProxy<T[K][K_1][K_2][K_3][K_4]>; } & T[K][K_1][K_2][K_3] : DeepMockProxy<T[K][K_1][K_2][K_3]>; } & T[K][K_1][K_2] : DeepMockProxy<T[K][K_1][K_2]>; } & T[K][K_1] : DeepMockProxy<T[K][K_1]>; } & T[K] : DeepMockProxy<T[K]>; } & T;
declare const mock: <T, MockedReturn extends { [K in keyof T]: T[K] extends (...args: infer A) => infer B ? CalledWithMock<B, A> : T[K]; } & T = { [K in keyof T]: T[K] extends (...args: infer A) => infer B ? CalledWithMock<B, A> : T[K]; } & T>(mockImplementation?: DeepPartial<T>, opts?: MockOpts | undefined) => MockedReturn;
export declare const mockFn: <T extends Function, A extends any[] = T extends (...args: infer AReal) => any ? AReal : any[], R = T extends (...args: any) => infer RReal ? RReal : any>() => CalledWithMock<R, A> & T;
export declare const stub: <T extends object>() => T;
export default mock;
