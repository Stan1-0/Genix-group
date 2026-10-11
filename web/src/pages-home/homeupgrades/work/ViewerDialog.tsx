/* The project viewer dialog (behaviour: components/motion/ProjectViewer). Prev/next show only for galleries of 2+ photos. */
export function ViewerDialog() {
  const chevron = (d: string) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
  return (
    <dialog className="viewer" id="viewer" aria-labelledby="viewerTitle">
      <div className="viewer-inner">
        <div id="viewerMediaSlot" style={{ display: 'contents' }}></div>
        <div className="viewer-nav" id="viewerNav" hidden>
          <button type="button" id="viewerPrev" aria-label="Previous photo">
            {chevron('M15 5l-7 7 7 7')}
          </button>
          <span id="viewerCount" aria-live="polite"></span>
          <button type="button" id="viewerNext" aria-label="Next photo">
            {chevron('M9 5l7 7-7 7')}
          </button>
        </div>
        <p className="viewer-cap">
          <b id="viewerTitle"></b>
          <span id="viewerDesc"></span>
        </p>
      </div>
      <button className="viewer-close" id="viewerClose" aria-label="Close project view">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </dialog>
  )
}
