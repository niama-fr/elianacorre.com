import { Schema as S } from "effect";

import { IMAGE_ACCEPTED_TYPES, PDF_ACCEPTED_TYPES } from "../helpers/storage";

// CONTENT TYPES ---------------------------------------------------------------------------------------------------------------------------
export const sStorageContentTypePdf = S.Literals(PDF_ACCEPTED_TYPES);
export const sStorageContentTypeImage = S.Literals(IMAGE_ACCEPTED_TYPES);
export const sStorageContentType = S.Literals([...PDF_ACCEPTED_TYPES, ...IMAGE_ACCEPTED_TYPES]);
