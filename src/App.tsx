import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { DEFAULT_ACTION_URL, getActionDestination, PRIMARY_NAVIGATION } from "./config/links";
import PageShell from "./pages/PageShell";

const HomeSource = lazy(() => import("./pages/design/HomeSource"));
const DestinationsSource = lazy(() => import("./pages/design/DestinationsSource"));
const ItineraryMapSource = lazy(() => import("./pages/design/ItineraryMapSource"));
const AboutGallerySource = lazy(() => import("./pages/design/AboutGallerySource"));
const FoodDrinksSource = lazy(() => import("./pages/design/FoodDrinksSource"));
const TripLogisticsSource = lazy(() => import("./pages/design/TripLogisticsSource"));
const InteractiveMapSource = lazy(() => import("./pages/design/InteractiveMapSource"));
const ReviewReaderSource = lazy(() => import("./pages/design/ReviewReaderSource"));

function selectAction(group: Element, action: HTMLElement, allowClear = false) {
  const controls = group.querySelectorAll<HTMLElement>('[role="button"]');
  const alreadySelected = action.getAttribute("aria-pressed") === "true";
  const selected = allowClear && alreadySelected ? null : action;

  controls.forEach((control) => {
    control.setAttribute("aria-pressed", String(control === selected));
  });
  group.setAttribute("data-selection-updated", "true");
  return selected;
}

function sourceText(sectionName: string) {
  const section = Array.from(
    document.querySelectorAll<HTMLElement>(".design-screen [data-pencil-name]"),
  ).find((element) => element.dataset.pencilName === sectionName);
  return section?.innerText.trim() ?? "";
}

function downloadText(content: string, fileName: string) {
  if (!content) return;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function imageWithAsset(container: HTMLElement) {
  return [container, ...container.querySelectorAll<HTMLElement>("*")].find((element) =>
    getComputedStyle(element).backgroundImage.includes("/assets/"),
  );
}

function galleryImages(page: HTMLElement) {
  return Array.from(
    page.querySelectorAll<HTMLElement>('[data-pencil-name^="IMAGE [USER_PHOTO_GALLERY_"]'),
  )
    .filter((image) => /^IMAGE \[USER_PHOTO_GALLERY_\d+\]$/.test(image.dataset.pencilName ?? ""))
    .sort((left, right) => {
      const number = (image: HTMLElement) =>
        Number(image.dataset.pencilName?.match(/_(\d+)\]$/)?.[1] ?? 0);
      return number(left) - number(right);
    });
}

function showGalleryImage(page: HTMLElement, index: number) {
  const images = galleryImages(page);
  const sourceImage = images[index];
  const source = sourceImage && imageWithAsset(sourceImage);
  const preview = page.querySelector<HTMLElement>('[data-pencil-name="Lightbox Preview"]');
  const previewImage = preview?.querySelector<HTMLElement>(
    '[data-pencil-name="IMAGE [USER_PHOTO_GALLERY_LIGHTBOX]"]',
  );
  const asset = source && getComputedStyle(source).backgroundImage;
  if (!preview || !previewImage || !asset) return false;

  preview.hidden = false;
  preview.dataset.currentIndex = String(index);
  previewImage.style.backgroundImage = asset;
  const frame = sourceImage.closest<HTMLElement>('[data-pencil-name^="Frame —"]');
  const title = preview.querySelector<HTMLElement>('[data-pencil-name="Lightbox Title"]');
  if (frame && title) title.textContent = frame.dataset.pencilName?.replace(/^Frame — /, "") ?? "";
  return true;
}

function currentGalleryIndex(page: HTMLElement, preview: HTMLElement) {
  const savedIndex = Number(preview.dataset.currentIndex);
  if (Number.isInteger(savedIndex) && preview.dataset.currentIndex !== undefined) {
    return savedIndex;
  }

  const previewImage = preview.querySelector<HTMLElement>(
    '[data-pencil-name="IMAGE [USER_PHOTO_GALLERY_LIGHTBOX]"]',
  );
  const previewSource = previewImage && imageWithAsset(previewImage);
  const previewBackground = previewSource
    ? getComputedStyle(previewSource).backgroundImage
    : "";
  const images = galleryImages(page);
  const match = images.findIndex((image) => {
    const source = imageWithAsset(image);
    return source && getComputedStyle(source).backgroundImage === previewBackground;
  });
  return match >= 0 ? match : 0;
}

function findSourceAction(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;

  let node: Element | null = target;
  while (node) {
    if (node instanceof HTMLElement && node.getAttribute("role")) return node;
    node = node.parentElement;
  }
  return null;
}

function Website() {
  const navigate = useNavigate();
  const location = useLocation();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentNavigationLabel =
    PRIMARY_NAVIGATION.find(({ path }) => path === location.pathname)?.label ?? "Explore";

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    const updateCurrentLink = () => {
      main.querySelectorAll<HTMLElement>(".design-screen [role='link']").forEach((link) => {
        const destination = getActionDestination(link.dataset.pencilName ?? "");
        if (destination.type === "route" && destination.path === location.pathname) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    updateCurrentLink();
    const observer = new MutationObserver(updateCurrentLink);
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [location.pathname]);

  useEffect(() => {
    if (!reviewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReviewOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [reviewOpen]);

  useEffect(() => {
    if (location.pathname !== "/about") return;

    const moveLightbox = (event: KeyboardEvent) => {
      const page = document.querySelector<HTMLElement>(".design-screen");
      const preview = page?.querySelector<HTMLElement>(
        '[data-pencil-name="Lightbox Preview"]',
      );
      if (!page || !preview || preview.hidden) return;

      if (event.key === "Escape") {
        preview.hidden = true;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const images = galleryImages(page);
        if (!images.length) return;
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        const nextIndex =
          (currentGalleryIndex(page, preview) + direction + images.length) % images.length;
        showGalleryImage(page, nextIndex);
      } else {
        return;
      }
      event.preventDefault();
    };

    window.addEventListener("keydown", moveLightbox);
    return () => window.removeEventListener("keydown", moveLightbox);
  }, [location.pathname]);

  useEffect(() => {
    if (!pendingScroll) return;

    let attempts = 0;
    let frame = 0;
    const scrollWhenReady = () => {
      const target = Array.from(
        document.querySelectorAll<HTMLElement>(".design-screen [data-pencil-name]"),
      ).find((element) => element.dataset.pencilName === pendingScroll);

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        setPendingScroll(null);
      } else if (attempts++ < 60) {
        frame = requestAnimationFrame(scrollWhenReady);
      } else {
        setPendingScroll(null);
      }
    };

    frame = requestAnimationFrame(scrollWhenReady);
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, pendingScroll]);

  const handleAction = (target: EventTarget | null) => {
    const action = findSourceAction(target);
    if (!action) return;

    const label = action.dataset.pencilName ?? "";
    const destination = getActionDestination(label);
    const redirectToDestination = () => {
      setReviewOpen(false);
      window.location.assign(
        destination.type === "url" ? destination.url : DEFAULT_ACTION_URL,
      );
    };
    if (destination.type === "route") {
      setReviewOpen(false);
      if (label === "CTA — Read the journal" || label === "CTA — Read the full journal") {
        setPendingScroll(label.includes("full journal") ? "Long Read" : "Journal Feed");
      } else if (label === "CTA — See all 23 dishes") {
        setPendingScroll("Food Grid");
      }
      navigate(destination.path);
      window.scrollTo({ top: 0 });
      return;
    }

    if (/^CTA — (Book|Reserve|Food tour|Get pass|Get transport pass|Get travel insurance)/.test(label)) {
      redirectToDestination();
      return;
    }

    if (label === "CTA — Download checklist") {
      const content = sourceText("Packing Section");
      if (!content) {
        redirectToDestination();
        return;
      }
      downloadText(content, "thailand-packing-checklist.txt");
      return;
    }

    if (label === "CTA — Download expenses") {
      const content = sourceText("Dashboard Card");
      if (!content) {
        redirectToDestination();
        return;
      }
      downloadText(content, "thailand-trip-expenses.txt");
      return;
    }

    if (label === "Save Button") {
      window.print();
      return;
    }

    if (label === "Download PDF Button") {
      window.print();
      return;
    }

    if (label.startsWith("Filter —")) {
      const group = action.closest('[data-pencil-name="Pills"]');
      const page = action.closest(".design-screen");
      if (!group || !page) {
        redirectToDestination();
        return;
      }

      const selected = selectAction(group, action);
      const filter = selected?.dataset.pencilName?.replace("Filter — ", "") ?? "All";
      const locations: Record<string, string[]> = {
        Bangkok: ["bangkok"],
        "Chiang Mai": ["chiang mai"],
        "Phuket & Islands": ["phuket", "krabi", "koh kood"],
        "Northern Trails": ["chiang mai", "pai", "mae hong son", "sukhothai"],
      };
      page.querySelectorAll<HTMLElement>('[data-pencil-name^="Feed Row "]').forEach((row) => {
        const cards = Array.from(
          row.querySelectorAll<HTMLElement>('[data-pencil-name^="Review Card —"]'),
        );
        if (cards.length) {
          cards.forEach((card) => {
            const cardText = card.innerText.toLowerCase();
            card.hidden = Boolean(
              locations[filter] && !locations[filter].some((location) => cardText.includes(location)),
            );
          });
          row.hidden = cards.every((card) => card.hidden);
        } else {
          const rowText = row.innerText.toLowerCase();
          row.hidden = Boolean(
            locations[filter] && !locations[filter].some((location) => rowText.includes(location)),
          );
        }
      });
      return;
    }

    if (label.startsWith("Tab —")) {
      const group = action.closest('[data-pencil-name="Tabs"]');
      const page = action.closest(".design-screen");
      if (!group || !page) {
        redirectToDestination();
        return;
      }

      const selected = selectAction(group, action);
      const category = selected?.dataset.pencilName?.replace("Tab — ", "").toUpperCase();
      page.querySelectorAll<HTMLElement>('[data-pencil-name^="Food Card —"]').forEach((card) => {
        card.hidden = Boolean(category && !card.innerText.toUpperCase().includes(category));
      });
      return;
    }

    if (label.startsWith("Vibe —") || label.startsWith("Budget —")) {
      const page = action.closest(".design-screen");
      const group = action.closest(
        label.startsWith("Vibe —")
          ? '[data-pencil-name="Vibe Filters"]'
          : '[data-pencil-name="Budget Filters"]',
      );
      if (!page || !group) {
        redirectToDestination();
        return;
      }

      selectAction(group, action, true);
      const activeVibe = page.querySelector<HTMLElement>(
        '[data-pencil-name^="Vibe —"][aria-pressed="true"]',
      )?.dataset.pencilName?.replace("Vibe — ", "");
      const activeBudget = page.querySelector<HTMLElement>(
        '[data-pencil-name^="Budget —"][aria-pressed="true"]',
      )?.dataset.pencilName?.replace("Budget — ", "");
      const vibeTerms: Record<string, string[]> = {
        "Street Food": ["market", "street food", "noodles", "food stall"],
        Culture: ["temple", "wat ", "ruins", "history", "old town"],
        Nature: ["mountain", "waterfall", "forest", "misty", "loop"],
        Beach: ["beach", "island", "coast", "shore"],
        Luxury: ["cost $$$", "luxury", "resort"],
      };

      page.querySelectorAll<HTMLElement>('[data-pencil-name^="Destination —"]').forEach((card) => {
        const cardText = card.innerText.toLowerCase();
        const matchesVibe =
          !activeVibe || vibeTerms[activeVibe]?.some((term) => cardText.includes(term)) === true;
        const matchesBudget = !activeBudget || cardText.includes(`cost ${activeBudget}`);
        card.hidden = !matchesVibe || !matchesBudget;
      });
      return;
    }

    if (label.startsWith("View Tab —")) {
      const group = action.closest('[data-pencil-name="View Toggle Dock"]');
      if (!group) {
        redirectToDestination();
        return;
      }
      selectAction(group, action);
      const section = label.includes("Countrywide Map") ? "Map 01 Section" : "Map 02 Section";
      document
        .querySelector<HTMLElement>(`.design-screen [data-pencil-name="${section}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (label === "Refresh Button") {
      window.location.reload();
      return;
    }

    if (label === "Lightbox Close") {
      const preview = action.closest<HTMLElement>('[data-pencil-name="Lightbox Preview"]');
      if (preview) {
        preview.hidden = true;
      } else {
        redirectToDestination();
      }
      return;
    }

    if (label === "Lightbox Nav") {
      const preview = action.closest<HTMLElement>('[data-pencil-name="Lightbox Preview"]');
      const page = action.closest<HTMLElement>(".design-screen");
      if (!preview || !page) {
        redirectToDestination();
        return;
      }

      const images = galleryImages(page);
      if (!images.length) {
        redirectToDestination();
        return;
      }
      const navButtons = Array.from(preview.querySelectorAll('[data-pencil-name="Lightbox Nav"]'));
      const direction = navButtons.indexOf(action) === 0 ? -1 : 1;
      const currentIndex = currentGalleryIndex(page, preview);
      const nextIndex = (currentIndex + direction + images.length) % images.length;
      showGalleryImage(page, nextIndex);
      return;
    }

    if (label.startsWith("Review Card —")) {
      setReviewOpen(true);
      return;
    }

    if (label === "Close Button" || label === "Close Story Button") {
      setReviewOpen(false);
      return;
    }

    if (label === "Zoom Button") {
      const imageWrap = action.closest<HTMLElement>('[data-pencil-name="Image Wrap"]');
      const page = action.closest<HTMLElement>(".design-screen");
      if (!imageWrap || !page) {
        redirectToDestination();
        return;
      }

      const clickedImage = imageWrap.querySelector<HTMLElement>(
        '[data-pencil-name^="IMAGE [USER_PHOTO_GALLERY_"]',
      );
      const index = clickedImage ? galleryImages(page).indexOf(clickedImage) : -1;
      if (index >= 0 && showGalleryImage(page, index)) {
        page
          .querySelector<HTMLElement>('[data-pencil-name="Lightbox Preview"]')
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const image = imageWithAsset(imageWrap);
      const asset = image
        ? getComputedStyle(image).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]
        : undefined;
      if (asset && new URL(asset, window.location.href).pathname.startsWith("/assets/")) {
        window.open(asset, "_blank", "noopener,noreferrer");
      } else {
        redirectToDestination();
      }
      return;
    }

    redirectToDestination();
  };

  const onClick = (event: MouseEvent<HTMLElement>) => handleAction(event.target);
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const action = findSourceAction(event.target);
    if (action?.getAttribute("role")) {
      event.preventDefault();
      handleAction(event.target);
    }
  };

  return (
    <main onClick={onClick} onKeyDown={onKeyDown}>
      <nav
        className="mobile-site-nav"
        aria-label="Main navigation"
        data-expanded={mobileNavOpen}
      >
        <div className="mobile-site-nav-bar">
          <span className="mobile-site-nav-current">{currentNavigationLabel}</span>
          <button
            className="mobile-site-nav-toggle"
            type="button"
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-site-nav-list"
            onClick={() => setMobileNavOpen((isOpen) => !isOpen)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              {mobileNavOpen ? (
                <path d="m6 6 12 12M18 6 6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
            <span>{mobileNavOpen ? "Close" : "Menu"}</span>
          </button>
        </div>
        <div className="mobile-site-nav-list" id="mobile-site-nav-list">
          {PRIMARY_NAVIGATION.map(({ label, path }) => (
            <Link
              key={path}
              className="mobile-site-nav-link"
              to={path}
              aria-current={location.pathname === path ? "page" : undefined}
              onClick={() => setMobileNavOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<PageShell key="/"><HomeSource /></PageShell>} />
          <Route path="/destinations" element={<PageShell key="/destinations"><DestinationsSource /></PageShell>} />
          <Route path="/itinerary" element={<PageShell key="/itinerary"><ItineraryMapSource /></PageShell>} />
          <Route path="/about" element={<PageShell key="/about"><AboutGallerySource /></PageShell>} />
          <Route path="/food" element={<PageShell key="/food"><FoodDrinksSource /></PageShell>} />
          <Route path="/logistics" element={<PageShell key="/logistics"><TripLogisticsSource /></PageShell>} />
          <Route path="/map" element={<PageShell key="/map"><InteractiveMapSource /></PageShell>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {reviewOpen && (
        <div
          className="review-modal"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setReviewOpen(false);
          }}
        >
          <div className="review-modal-frame">
            <PageShell>
              <Suspense fallback={null}>
                <ReviewReaderSource />
              </Suspense>
            </PageShell>
          </div>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {location.pathname}
      </span>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Website />
    </BrowserRouter>
  );
}
