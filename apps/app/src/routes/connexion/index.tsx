import { readImagesBySlugs } from "@ec/domain/helpers/images";
import { Image } from "@ec/ui/components/image";
import { createFileRoute, Link } from "@tanstack/react-router";
import { cva } from "class-variance-authority";

import { getSafeAuthRedirect } from "@/infra/auth/redirects";
import { noindexHead } from "@/seo/head";

import { SigninForm } from "./-form";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/connexion/")({
  component: SignInPage,
  head: () => noindexHead("Connexion — Eliana Corré"),
  validateSearch: (search) => ({
    redirect: getSafeAuthRedirect(search.redirect),
  }),
});

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const PAGE = {
  aside: cva(`relative hidden 
  md:block`),
  base: cva(`grid min-h-svh 
  md:grid-cols-2`),
  formWrapper: cva(`flex flex-1 items-center justify-center`),
  header: cva(`flex justify-center gap-2 md:justify-start`),
  heading: cva(`font-heading flex items-center gap-2 text-3xl`),
  image: cva("h-full"),
  logoWrapper: cva("size-12 rounded-md bg-white"),
  main: cva(`relative flex flex-col gap-4 p-6 
  md:p-10`),
};

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function SignInPage() {
  const images = readImagesBySlugs(["logo", "le-bruit-de-la-nuit"]);

  return (
    <div className={PAGE.base()}>
      <div className={PAGE.main()}>
        <div className={PAGE.header()}>
          <Link to="/" className={PAGE.heading()}>
            <div className={PAGE.logoWrapper()}>
              <Image {...images[0]} background="transparent" />
            </div>
            Eliana Corré
          </Link>
        </div>
        <div className={PAGE.formWrapper()}>
          <SigninForm />
        </div>
      </div>
      <div className={PAGE.aside()}>
        <Image {...images[1]} className={PAGE.image()} />
      </div>
    </div>
  );
}
