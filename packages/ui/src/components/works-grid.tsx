import type { Works } from "@ec/domain/works";
import { cn } from "@ec/ui/lib/utils";
import { cva } from "class-variance-authority";
import { createMemo, For } from "solid-js";
import { ImageZoom } from "./image-zoom";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const WORKS_GRID = {
  base: cva(`group/list grid w-full grid-cols-1 gap-8
    sm:grid-cols-2
    lg:grid-cols-3`),
  infos:
    cva(`absolute inset-0 flex flex-col justify-center items-center bg-black/50 text-white transition-opacity duration-300 opacity-0 pointer-events-none
    group-hover/item:opacity-100`),
  item: cva(`flex-1 transition duration-300 group/item relative inset-shadow-2xs aspect-square w-full overflow-hidden rounded-3xl bg-neutral-200 shadow-lg cursor-pointer
    hover:scale-none hover:blur-none 
    group-hover/list:scale-[0.9] group-hover/list:blur-sm`),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function WorksGrid(_: WorksGridProps) {
  const C = createMemo(() => _.class ?? {});

  return (
    <ul class={cn(WORKS_GRID.base(), C().base)}>
      <For each={_.works}>
        {(work) => (
          <li class={cn(WORKS_GRID.item(), C().item)}>
            <ImageZoom
              alt={work.image.alt}
              background={work.image.background}
              breakpoints={[300, 384, 470, 600, 768, 940]}
              class="rounded-3xl"
              height={work.image.height}
              sizes="(min-width: 1536px) 470px, (min-width: 1280px) 384px, (min-width: 1024px) 300px, (min-width: 768px) 336px, (min-width: 640px) 272px, 100vw"
              src={work.image.src}
              width={work.image.width}
              zoomed={{ sizes: "100vw" }}
            />
            <div class={cn(WORKS_GRID.infos(), C().infos)}>
              <h3 class="text-center font-bold font-heading text-4xl">{work.title}</h3>
            </div>
          </li>
        )}
      </For>
    </ul>
  );
}
export type WorksGridProps = WorksGridStyles & { works: Works["Entity"][] };

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type WorksGridClass = Partial<Record<keyof typeof WORKS_GRID, string>>;
export type WorksGridStyles = { class?: WorksGridClass };
