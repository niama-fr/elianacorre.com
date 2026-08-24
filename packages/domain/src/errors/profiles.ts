import { Schema as S } from "effect";

export class ProfileNotFound extends S.TaggedError<ProfileNotFound>()("ProfileNotFound", {}) {}
