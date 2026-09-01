"use client";

import { cn } from "@/lib/utils";
import type { LandingDocument } from "@/lib/landing/types";

import { LandingFrame, renderSection } from "./section-renderer";

/**
 * Live preview surface for the editor. Renders the exact same sections the
 * public route will deploy, inside a device frame (desktop/mobile). In editor
 * mode every section is click-to-select and the lead form is inert.
 */

export type PreviewDevice = "desktop" | "mobile";

interface LandingPreviewProps {
  document: LandingDocument;
  pageId: string;
  device: PreviewDevice;
  selectedId?: string | null;
  onSelectSection?: (id: string) => void;
}

export function LandingPreview({ document, pageId, device, selectedId, onSelectSection }: LandingPreviewProps) {
  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-[width] duration-300 motion-reduce:transition-none",
          device === "mobile" ? "w-[390px] max-w-full" : "w-full",
        )}
      >
        <div className="max-h-[72vh] overflow-y-auto">
          <LandingFrame document={document}>
            {document.sections.map((section) => {
              const isSelected = selectedId === section.id;
              return (
                <div
                  key={section.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectSection?.(section.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectSection?.(section.id);
                    }
                  }}
                  className={cn(
                    "group/section relative cursor-pointer outline-none ring-inset transition-shadow",
                    isSelected ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary/60",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none absolute left-2 top-2 z-10 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground opacity-0 transition-opacity",
                      isSelected ? "opacity-100" : "group-hover/section:opacity-100",
                    )}
                  >
                    {section.label || section.type}
                  </span>
                  {renderSection(section, { mode: "editor", pageId })}
                </div>
              );
            })}
          </LandingFrame>
        </div>
      </div>
    </div>
  );
}
