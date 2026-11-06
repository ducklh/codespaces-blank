import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const DESIGN_WIDTH = 1440;
const REFLOW_BREAKPOINT = 1200;

type InlineStyle = Map<string, { value: string; priority: string }>;

function getInitialDimensions() {
  const availableWidth = document.documentElement.clientWidth || window.innerWidth;
  const reflow = availableWidth <= REFLOW_BREAKPOINT;

  return {
    scale: reflow ? 1 : Math.min(1, availableWidth / DESIGN_WIDTH),
    height: 0,
    reflow,
    mobile: availableWidth <= 600,
  };
}

export default function PageShell({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState(getInitialDimensions);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const savedStyles = new Map<HTMLElement, InlineStyle>();
    const updateResponsiveStyles = (reflow: boolean, scale: number) => {
      frame.querySelectorAll<HTMLElement>("[class]").forEach((element) => {
        const classNames = element.getAttribute("class") ?? "";
        const isPhoto = element.dataset.pencilName?.startsWith("IMAGE [USER_PHOTO_") ?? false;
        const isHistoryPhoto =
          element.dataset.pencilName === "IMAGE [USER_PHOTO_EXPANDED_AYUTTHAYA]";
        const photoWidth = classNames.match(/(?:^|\s)w-\[(\d+(?:\.\d+)?)px\]/);
        const photoHeight = classNames.match(/(?:^|\s)h-\[(\d+(?:\.\d+)?)px\]/);
        const fontMatch = classNames.match(/(?:^|\s)text-\[(\d+(?:\.\d+)?)px\]/);
        const lineHeightMatch = classNames.match(
          /text-\[\d+(?:\.\d+)?px\]\/\[(\d+(?:\.\d+)?)px\]/,
        );
        const trackingMatch = classNames.match(/tracking-\[(-?\d+(?:\.\d+)?)px\]/);
        const spacingUtilities: Record<string, string> = {
          p: "padding",
          px: "padding-inline",
          py: "padding-block",
          pt: "padding-top",
          pr: "padding-right",
          pb: "padding-bottom",
          pl: "padding-left",
          m: "margin",
          mx: "margin-inline",
          my: "margin-block",
          mt: "margin-top",
          mr: "margin-right",
          mb: "margin-bottom",
          ml: "margin-left",
          gap: "gap",
          "gap-x": "column-gap",
          "gap-y": "row-gap",
        };
        const responsiveValues = new Map<string, string>();
        if (isPhoto && photoHeight) {
          if (/(?:^|\s)absolute(?:\s|$)/.test(classNames)) {
            responsiveValues.set("position", "absolute");
            responsiveValues.set("inset", "0px");
            responsiveValues.set("width", "100%");
            responsiveValues.set("height", "100%");
            responsiveValues.set("max-width", "none");
            responsiveValues.set("flex", "none");
          } else {
            responsiveValues.set("position", "relative");
            responsiveValues.set("inset", "auto");
            responsiveValues.set("width", "100%");
            const parentDirection = element.parentElement
              ? getComputedStyle(element.parentElement).flexDirection
              : "row";
            responsiveValues.set("flex", parentDirection === "row" ? "0 0 100%" : "0 0 auto");
            if (photoWidth) {
              if (isHistoryPhoto) {
                responsiveValues.set("height", "clamp(220px, 70vw, 320px)");
                responsiveValues.set("aspect-ratio", "auto");
              } else {
                responsiveValues.set("height", "auto");
                responsiveValues.set(
                  "aspect-ratio",
                  `${Number(photoWidth[1])} / ${Number(photoHeight[1])}`,
                );
              }
            } else {
              responsiveValues.set(
                "height",
                `${Math.max(160, Math.min(360, Number(photoHeight[1]) * scale))}px`,
              );
            }
          }
        }

        if (fontMatch) {
          const sourceFontSize = Number(fontMatch[1]);
          const minimumFontSize =
            sourceFontSize <= 12 ? 12 : sourceFontSize >= 32 ? 22 : sourceFontSize >= 22 ? 16 : 14;
          const preferredFontSize = `${((sourceFontSize / DESIGN_WIDTH) * 100).toFixed(4)}vw`;
          const sourceLineHeight = Number(lineHeightMatch?.[1] ?? sourceFontSize);
          const minimumLineHeight = Math.ceil(minimumFontSize * 1.35);
          const maximumLineHeight = Math.max(sourceLineHeight, minimumLineHeight);
          const preferredLineHeight = `${((sourceLineHeight / DESIGN_WIDTH) * 100).toFixed(4)}vw`;
          responsiveValues.set(
            "font-size",
            `clamp(${minimumFontSize}px, ${preferredFontSize}, ${sourceFontSize}px)`,
          );
          responsiveValues.set(
            "line-height",
            `clamp(${minimumLineHeight}px, ${preferredLineHeight}, ${maximumLineHeight}px)`,
          );
          if (trackingMatch) {
            responsiveValues.set("letter-spacing", `${Number(trackingMatch[1]) * scale}px`);
          }
        }

        classNames.split(/\s+/).forEach((className) => {
          const match = className.match(/^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y)-\[([^\]]+)\]$/);
          if (!match) return;
          const [, utility, values] = match;
          const minimum = utility.startsWith("gap") ? 8 : utility.startsWith("p") ? 12 : 4;
          const scaledValues = values.split("_").map((value) =>
            value.replace(/-?\d+(?:\.\d+)?px/g, (length) => {
              const scaled = Number.parseFloat(length) * scale;
              if (scaled <= 0) return `${scaled}px`;
              return `${Math.max(minimum, scaled)}px`;
            }),
          );
          responsiveValues.set(spacingUtilities[utility], scaledValues.join(" "));
        });

        if (trackingMatch && !responsiveValues.has("letter-spacing")) {
          responsiveValues.set("letter-spacing", `${Number(trackingMatch[1]) * scale}px`);
        }

        if (!savedStyles.has(element)) savedStyles.set(element, new Map());
        const original = savedStyles.get(element);
        if (!original) return;

        if (!reflow) {
          original.forEach((previous, property) => {
            if (previous?.value) {
              element.style.setProperty(property, previous.value, previous.priority);
            } else {
              element.style.removeProperty(property);
            }
          });
          return;
        }

        responsiveValues.forEach((value, property) => {
          if (!original.has(property)) {
            original.set(property, {
              value: element.style.getPropertyValue(property),
              priority: element.style.getPropertyPriority(property),
            });
          }
          element.style.setProperty(property, value, "important");
        });
      });
    };

    const updateSize = () => {
      const availableWidth = frame.parentElement?.clientWidth || window.innerWidth;
      const reflow = availableWidth <= REFLOW_BREAKPOINT;
      const scale = Math.min(1, (availableWidth + 100) / DESIGN_WIDTH);
      updateResponsiveStyles(reflow, scale);
      const layoutScale = reflow ? 1 : availableWidth / DESIGN_WIDTH;
      setDimensions({
        scale: layoutScale,
        height: Math.ceil(frame.scrollHeight * layoutScale),
        reflow,
        mobile: availableWidth <= 600,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(frame);
    if (frame.parentElement) observer.observe(frame.parentElement);
    window.addEventListener("resize", updateSize);
    const mutationObserver = new MutationObserver(updateSize);
    mutationObserver.observe(frame, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  return (
    <div
      className="page-shell"
      data-responsive={dimensions.reflow ? "reflow" : undefined}
      data-mobile={dimensions.mobile ? "true" : undefined}
      style={{ height: dimensions.height ? `${dimensions.height}px` : undefined }}
    >
      <div
        ref={frameRef}
        className="page-frame"
        style={{
          transform: `scale(${dimensions.scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
