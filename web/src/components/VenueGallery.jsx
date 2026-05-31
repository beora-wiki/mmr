import { useState } from "react"

const PHOTOS = [
  { file: "Villa_Maria_Image_2_copy.jpg",  caption: "Villa Maria Del Mar" },
  { file: "villa_maria_image_15_copy.jpg", caption: "Aerial View" },
  { file: "villa_maria_4_copy.jpg",        caption: "Garden Walkway" },
  { file: "villa_maria_image_3_copy.jpg",  caption: "The Garden" },
  { file: "villa_maria_image_5_copy.jpg",  caption: "Our Lady of Villa Maria" },
  { file: "Villa_Maria_Image_1__copy.jpg", caption: "Sacred Heart Chapel" },
  { file: "villa_maria_image_6_copy.jpg",  caption: "Chapel Entrance" },
  { file: "villa_maria_image_7_copy.jpg",  caption: "Chapel Interior" },
  { file: "villa_maria_image_13_copy.jpg", caption: "The Pacific Ocean" },
  { file: "villa_maria_image_14_copy.jpg", caption: "East Cliff Drive" },
  { file: "villa_maria_image_12_copy.jpg", caption: "Flowering Gardens" },
  { file: "villa_maria_image_17_copy.jpg", caption: "California Poppies" },
]

export default function VenueGallery() {
  const [selected, setSelected] = useState(null)

  function prev(e) {
    e.stopPropagation()
    setSelected(s => (s - 1 + PHOTOS.length) % PHOTOS.length)
  }
  function next(e) {
    e.stopPropagation()
    setSelected(s => (s + 1) % PHOTOS.length)
  }

  return (
    <>
      <div className="section-header">Gallery</div>
      <div className="gallery-grid">
        {PHOTOS.map((p, i) => (
          <button key={i} className="gallery-thumb" onClick={() => setSelected(i)} aria-label={p.caption}>
            <img src={`/venue/${p.file}`} alt={p.caption} loading="lazy" />
          </button>
        ))}
      </div>

      {selected !== null && (
        <div className="lightbox" onClick={() => setSelected(null)}>
          <button className="lightbox-close" onClick={() => setSelected(null)}>✕</button>
          <div className="lightbox-inner" onClick={e => e.stopPropagation()}>
            <img
              src={`/venue/${PHOTOS[selected].file}`}
              alt={PHOTOS[selected].caption}
              className="lightbox-img"
            />
            <p className="lightbox-caption">{PHOTOS[selected].caption}</p>
            <div className="lightbox-nav">
              <button className="lightbox-btn" onClick={prev}>‹</button>
              <span className="lightbox-count">{selected + 1} / {PHOTOS.length}</span>
              <button className="lightbox-btn" onClick={next}>›</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
