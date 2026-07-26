import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

// Fullscreen swipeable image viewer with pinch / double-tap / wheel zoom.
// slides = [{ src }]. Controlled by `open` + `index` from the parent.
export default function ImageLightbox({ open, index, slides, onClose, onIndexChange }) {
  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={slides}
      plugins={[Zoom]}
      zoom={{ maxZoomPixelRatio: 3, doubleTapDelay: 250 }}
      carousel={{ finite: slides.length <= 1, padding: 0 }}
      on={{ view: ({ index: i }) => onIndexChange?.(i) }}
      controller={{ closeOnBackdropClick: true }}
      styles={{ container: { backgroundColor: 'rgba(0,0,0,.92)' } }}
    />
  );
}
