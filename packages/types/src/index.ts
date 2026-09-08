import {
  LotteryClientToServerEvents,
  LotteryServerToClientEvents,
} from "./lottery";
import {
  PokemonClientToServerEvents,
  PokemonServerToClientEvents,
} from "./pokemon";
import {
  StreamClientToServerEvents,
  StreamServerToClientEvents,
} from "./stream";
import {
  TwitchClientToServerEvents,
  TwitchServerToClientEvents,
} from "./twitch";
import {
  UserClientToServerEvents,
  UserServerToClientEvents,
} from "./user";

export * from "./lottery/index";
export * from "./pokemon/index";
export * from "./stream/index";
export * from "./twitch/index";
export * from "./user/index";

type IntersectionFromTuple<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Tail,
]
  ? Head & IntersectionFromTuple<Tail>
  : unknown;

type AllServerEvents = [
  LotteryServerToClientEvents,
  PokemonServerToClientEvents,
  StreamServerToClientEvents,
  TwitchServerToClientEvents,
  UserServerToClientEvents,
];
type AllClientEvents = [
  LotteryClientToServerEvents,
  PokemonClientToServerEvents,
  StreamClientToServerEvents,
  TwitchClientToServerEvents,
  UserClientToServerEvents,
];

export type ServerToClientEvents = IntersectionFromTuple<AllServerEvents>;
export type ClientToServerEvents = IntersectionFromTuple<AllClientEvents>;
