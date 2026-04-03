import { useMemo } from "react";

type SavedImageView = {
  id: string;
  title: string;
  url: string;
  createdAt: number;
  kind?: string;
  mimeType: string;
  fileName?: string;
  storyboardTitle?: string;
};

interface SavedImagesPaneProps {
  images: SavedImageView[];
  formatTimestamp: (value: number) => string;
  mimeToExtension: (mimeType: string | null) => string;
  onOpenImage: (src: string, title: string, alt?: string) => void;
  onDeleteImage: (id: string) => void;
}

export default function SavedImagesPane({
  images,
  formatTimestamp,
  mimeToExtension,
  onOpenImage,
  onDeleteImage,
}: SavedImagesPaneProps) {
  const printsImages = useMemo(() => images.filter((img) => img.kind === "prints"), [images]);
  const generatedImages = useMemo(
    () => images.filter((img) => img.kind !== "prints" && !img.kind?.startsWith("asset-")),
    [images],
  );

  const sections = [
    {
      key: "prints",
      title: "Added Prints",
      description: "Printed garments saved from the Add Prints workflow.",
      empty: "No saved printed garments yet.",
      badgeTitle: "Saved Add Prints images",
      ariaLabel: "Saved images from Add Prints page",
      images: printsImages,
    },
    {
      key: "generate",
      title: "Generated Images",
      description: "Main looks and multi-angle exports saved from generation.",
      empty: "No saved generated looks yet.",
      badgeTitle: "Saved Generate Image exports",
      ariaLabel: "Saved images from Generate Image page",
      images: generatedImages,
    },
  ];

  return (
    <div className="savedImagesPane">
      <div className="savedImagesHeader">
        <div>
          <div className="title" style={{ fontSize: 18, margin: 0 }}>Your saved exports</div>
        </div>
        <div className="badge" title="Total saved images">
          <span>Total</span>
          <code>{images.length}</code>
        </div>
      </div>

      <div className="savedImagesSections">
        {sections.map((section) => (
          <section key={section.key} className="savedImagesSection">
            <div className="savedImagesSectionHeader">
              <div>
                <div className="savedImagesSectionTitle">{section.title}</div>
                <div className="savedImagesSectionMeta">{section.description}</div>
              </div>
              <div className="badge" title={section.badgeTitle}>
                <span>Items</span>
                <code>{section.images.length}</code>
              </div>
            </div>

            {!section.images.length ? (
              <div className="savedImagesSectionEmpty">
                <div className="muted">{section.empty}</div>
              </div>
            ) : (
              <div className="savedImagesGrid compactGrid" role="list" aria-label={section.ariaLabel}>
                {section.images.map((image) => (
                  <div key={image.id} className="savedImageCard" role="listitem">
                    <div className="savedImagePreviewContainer">
                      <button
                        type="button"
                        className="savedImagePreview"
                        onClick={() => onOpenImage(image.url, image.title, image.title)}
                        aria-label={`Open ${image.title}`}
                      >
                        <img src={image.url} alt={image.title} draggable={false} />
                      </button>
                      <div className="savedImageOverlay">
                        <button
                          type="button"
                          className="overlayButton"
                          onClick={() => onOpenImage(image.url, image.title, image.title)}
                          aria-label="Maximize image"
                          title="Maximize"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                          </svg>
                        </button>
                        <a
                          className="overlayButton"
                          href={image.url}
                          download={image.fileName || `saved-${image.id}.${mimeToExtension(image.mimeType)}`}
                          aria-label="Download saved image"
                          title="Download"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 3v10" />
                            <path d="M8 11l4 4 4-4" />
                            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                          </svg>
                        </a>
                        <button
                          type="button"
                          className="overlayButton danger"
                          onClick={(e) => { e.stopPropagation(); onDeleteImage(image.id); }}
                          aria-label="Delete image"
                          title="Delete"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="savedImageMeta">
                      <div className="savedImageTitle" title={image.title}>{image.title}</div>
                      <div className="savedImageSub">{formatTimestamp(image.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
