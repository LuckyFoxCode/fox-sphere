import {
  LotteryClientToServerEvents,
  LotteryServerToClientEvents,
} from "./lottery/lottery.js";
import {
  TwitchClientToServerEvents,
  TwitchServerToClientEvents,
} from "./twitch/twitch.js";

export * from "./lottery/index.js";
export * from "./twitch/index.js";

type IntersectionFromTuple<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Tail,
]
  ? Head & IntersectionFromTuple<Tail>
  : unknown;

type AllServerEvents = [
  LotteryServerToClientEvents,
  TwitchServerToClientEvents,
];
type AllClientEvents = [
  LotteryClientToServerEvents,
  TwitchClientToServerEvents,
];

export type ServerToClientEvents = IntersectionFromTuple<AllServerEvents>;
export type ClientToServerEvents = IntersectionFromTuple<AllClientEvents>;
