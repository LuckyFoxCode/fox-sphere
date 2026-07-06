import {
  LotteryClientToServerEvents,
  LotteryServerToClientEvents,
} from "./lottery/lottery.js";
import {
  TwitchClientToServerEvents,
  TwitchServerToClientEvents,
} from "./twitch/twitch.js";
import {
  UserClientToServerEvents,
  UserServerToClientEvents,
} from "./user/user.js";

export * from "./lottery/index.js";
export * from "./twitch/index.js";
export * from "./user/index.js";

type IntersectionFromTuple<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Tail,
]
  ? Head & IntersectionFromTuple<Tail>
  : unknown;

type AllServerEvents = [
  LotteryServerToClientEvents,
  TwitchServerToClientEvents,
  UserServerToClientEvents,
];
type AllClientEvents = [
  LotteryClientToServerEvents,
  TwitchClientToServerEvents,
  UserClientToServerEvents,
];

export type ServerToClientEvents = IntersectionFromTuple<AllServerEvents>;
export type ClientToServerEvents = IntersectionFromTuple<AllClientEvents>;
