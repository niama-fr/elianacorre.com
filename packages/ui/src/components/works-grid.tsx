import type { Works } from "@ec/domain/helpers/works";
import { Image } from "@ec/ui/components/image";
import { ImageZoom } from "@ec/ui/components/image-zoom";
import { cn } from "@ec/ui/lib/utils";
import { cva } from "class-variance-authority";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const WORKS_GRID = {
  base: cva(`group/list grid w-full grid-cols-1 gap-8
    sm:grid-cols-2
    lg:grid-cols-3`),
  img: cva("absolute size-full object-cover"),
  infos:
    cva(`absolute inset-0 flex flex-col justify-center items-center bg-black/50 text-white transition-opacity duration-300 opacity-0 pointer-events-none
    group-hover/item:opacity-100`),
  item: cva(`flex-1 transition duration-300 group/item relative inset-shadow-2xs aspect-square w-full overflow-hidden rounded-3xl bg-neutral-200 shadow-lg cursor-pointer
    hover:scale-none hover:blur-none 
    group-hover/list:scale-[0.9] group-hover/list:blur-sm`),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function WorksGrid(props: WorksGridProps) {
  const { className: C = {}, works } = props;

  return (
    <ul className={cn(WORKS_GRID.base(), C.base)}>
      {works.map((work) => (
        <li className={cn(WORKS_GRID.item(), C.item)} key={work.slug}>
          <ImageZoom zoomImg={{ ...work.image, sizes: "100vw" }}>
            <Image
              {...work.image}
              breakpoints={[300, 384, 470, 600, 768, 940]}
              className={cn(WORKS_GRID.img(), C.img)}
              sizes="(min-width: 1536px) 470px, (min-width: 1280px) 384px, (min-width: 1024px) 300px, (min-width: 768px) 336px, (min-width: 640px) 272px, 100vw"
            />
          </ImageZoom>
          <div className={cn(WORKS_GRID.infos(), C.infos)}>
            <h3 className="text-center font-bold font-heading text-4xl">{work.title}</h3>
          </div>
        </li>
      ))}
    </ul>
  );
}
export type WorksGridProps = WorksGridStyles & { works: Works["Entity"][] };

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type WorksGridClass = Partial<Record<keyof typeof WORKS_GRID, string>>;
export type WorksGridStyles = { className?: WorksGridClass };
