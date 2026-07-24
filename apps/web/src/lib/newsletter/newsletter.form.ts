import { formOptions } from "@tanstack/react-form-start";

export const newsletterFormOptions = formOptions({
  defaultValues: { consent: false, email: "", firstName: "", legalBundleId: "", website: "" },
});
