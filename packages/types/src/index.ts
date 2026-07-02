import {
  LotteryClientToServerEvents,
  LotteryServerToClientEvents,
} from "./lottery/lottery.js";

export * from "./lottery/index.js";

type IntersectionFromTuple<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Tail,
]
  ? Head & IntersectionFromTuple<Tail>
  : unknown;

type AllServerEvents = [LotteryServerToClientEvents];
type AllClientEvents = [LotteryClientToServerEvents];

export type ServerToClientEvents = IntersectionFromTuple<AllServerEvents>;
export type ClientToServerEvents = IntersectionFromTuple<AllClientEvents>;
