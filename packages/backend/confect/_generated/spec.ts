import { GroupSpec, Spec } from "@confect/core";
import auth from "../auth.spec";
import cache from "../cache.spec";
import contactRequests from "../contactRequests.spec";
import dev from "../dev.spec";
import ebooks from "../ebooks.spec";
import legalTexts from "../legalTexts.spec";
import loops from "../loops.spec";
import newsletter from "../newsletter.spec";
import privacy from "../privacy.spec";
import profiles from "../profiles.spec";
import retention from "../retention.spec";
import seed from "../seed.spec";
import storage from "../storage.spec";
import travelPacks from "../travelPacks.spec";

const spec: Spec.Spec<
  | GroupSpec.NamedAt<typeof auth, "auth">
  | GroupSpec.NamedAt<typeof cache, "cache">
  | GroupSpec.NamedAt<typeof contactRequests, "contactRequests">
  | GroupSpec.NamedAt<typeof dev, "dev">
  | GroupSpec.NamedAt<typeof ebooks, "ebooks">
  | GroupSpec.NamedAt<typeof legalTexts, "legalTexts">
  | GroupSpec.NamedAt<typeof loops, "loops">
  | GroupSpec.NamedAt<typeof newsletter, "newsletter">
  | GroupSpec.NamedAt<typeof privacy, "privacy">
  | GroupSpec.NamedAt<typeof profiles, "profiles">
  | GroupSpec.NamedAt<typeof retention, "retention">
  | GroupSpec.NamedAt<typeof seed, "seed">
  | GroupSpec.NamedAt<typeof storage, "storage">
  | GroupSpec.NamedAt<typeof travelPacks, "travelPacks">
> = Spec.make().addAt("auth", auth).addAt("cache", cache).addAt("contactRequests", contactRequests).addAt("dev", dev).addAt("ebooks", ebooks).addAt("legalTexts", legalTexts).addAt("loops", loops).addAt("newsletter", newsletter).addAt("privacy", privacy).addAt("profiles", profiles).addAt("retention", retention).addAt("seed", seed).addAt("storage", storage).addAt("travelPacks", travelPacks);

export default spec;
