import { HttpClient } from "@confect/js";

import { publicEnv } from "@/config/env";

export const HttpClientLive = HttpClient.layer(publicEnv.VITE_CONVEX_URL);
