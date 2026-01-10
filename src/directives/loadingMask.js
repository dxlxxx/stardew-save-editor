import loadingGif from '../assets/image/loadingAnimation.gif'

const createMask = () => {
  const mask = document.createElement('div')
  mask.className = 'loading-mask'

  const img = document.createElement('img')
  img.className = 'loading-mask__img'
  img.src = loadingGif
  img.alt = 'loading'

  mask.appendChild(img)
  return mask
}

const updateMask = (el, isActive) => {
  const mask = el._loadingMask
  if (!mask) return
  mask.style.display = isActive ? 'flex' : 'none'
}

export default {
  mounted(el, binding) {
    const mask = createMask()
    el._loadingMask = mask
    if (getComputedStyle(el).position === 'static') {
      el.style.position = 'relative'
    }
    el.appendChild(mask)
    updateMask(el, Boolean(binding.value))
  },
  updated(el, binding) {
    updateMask(el, Boolean(binding.value))
  },
  unmounted(el) {
    const mask = el._loadingMask
    if (mask && mask.parentNode) {
      mask.parentNode.removeChild(mask)
    }
    delete el._loadingMask
  }
}
