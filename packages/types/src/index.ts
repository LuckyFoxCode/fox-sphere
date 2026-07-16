import {
  LotteryClientToServerEvents,
  LotteryServerToClientEvents,
} from "./lottery/lottery.js";
import {
  StreamClientToServerEvents,
  StreamServerToClientEvents,
} from "./stream/stream.js";
import {
  TwitchClientToServerEvents,
  TwitchServerToClientEvents,
} from "./twitch/twitch.js";
import {
  UserClientToServerEvents,
  UserServerToClientEvents,
} from "./user/user.js";

export * from "./lottery/index.js";
export * from "./stream/index.js";
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
  StreamServerToClientEvents,
  TwitchServerToClientEvents,
  UserServerToClientEvents,
];
type AllClientEvents = [
  LotteryClientToServerEvents,
  StreamClientToServerEvents,
  TwitchClientToServerEvents,
  UserClientToServerEvents,
];

export type ServerToClientEvents = IntersectionFromTuple<AllServerEvents>;
export type ClientToServerEvents = IntersectionFromTuple<AllClientEvents>;
