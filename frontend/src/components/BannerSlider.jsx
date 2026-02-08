import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { API_URL, API_BASE_URL } from '../config/api'

const BannerSlider = ({ isDarkMode = true }) => {
  const [banners, setBanners] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    try {
      const res = await fetch(`${API_URL}/banners/active`)
      const data = await res.json()
      if (data.success && data.banners.length > 0) {
        setBanners(data.banners)
      }
    } catch (error) {
      console.error('Error fetching banners:', error)
    } finally {
      setLoading(false)
    }
  }

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length)
  }, [banners.length])

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
  }

  const goToSlide = (index) => {
    setCurrentIndex(index)
  }

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (banners.length <= 1) return
    const interval = setInterval(nextSlide, 5000)
    return () => clearInterval(interval)
  }, [banners.length, nextSlide])

  if (loading) {
    return (
      <div className={`w-full h-48 rounded-xl animate-pulse ${isDarkMode ? 'bg-dark-800' : 'bg-gray-200'}`} />
    )
  }

  if (banners.length === 0) {
    return null
  }

  const baseUrl = API_BASE_URL

  return (
    <div className="relative w-full overflow-hidden rounded-xl group">
      {/* Slides Container */}
      <div 
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner, index) => (
          <div key={banner._id} className="w-full flex-shrink-0">
            {banner.link ? (
              <a href={banner.link} target="_blank" rel="noopener noreferrer">
                <img
                  src={`${baseUrl}${banner.imageUrl}`}
                  alt={banner.title}
                  className="w-full h-48 md:h-56 object-cover rounded-xl"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/1200x400?text=Banner'
                  }}
                />
              </a>
            ) : (
              <img
                src={`${baseUrl}${banner.imageUrl}`}
                alt={banner.title}
                className="w-full h-48 md:h-56 object-cover rounded-xl"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/1200x400?text=Banner'
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-white w-6' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default BannerSlider
