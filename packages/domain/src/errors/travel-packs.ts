import { Schema as S } from "effect";

import { sTravelPackError } from "../schemas/travel-packs";

export class TravelPackNotFound extends S.TaggedError<TravelPackNotFound>()("TravelPackNotFound", {}) {}

export class TravelPackFailure extends S.TaggedError<TravelPackFailure>()("TravelPackFailure", { code: sTravelPackError }) {}
