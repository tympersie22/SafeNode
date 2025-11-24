/**
 * SafeNode Mobile Animation System
 * React Native Reanimated animations
 */

import { withSpring, withTiming, Easing } from 'react-native-reanimated'

// Button tap animation (scale 0.97)
export const buttonTapAnimation = {
  scale: withSpring(0.97, {
    damping: 15,
    stiffness: 300,
  }),
}

export const buttonReleaseAnimation = {
  scale: withSpring(1, {
    damping: 15,
    stiffness: 300,
  }),
}

// Page fade + slide
export const pageFadeSlideAnimation = {
  opacity: withTiming(1, {
    duration: 300,
    easing: Easing.out(Easing.ease),
  }),
  translateY: withTiming(0, {
    duration: 300,
    easing: Easing.out(Easing.ease),
  }),
}

export const pageFadeSlideInitial = {
  opacity: 0,
  translateY: 20,
}

// Card fade-in
export const cardFadeInAnimation = {
  opacity: withTiming(1, {
    duration: 300,
    easing: Easing.out(Easing.ease),
  }),
  scale: withSpring(1, {
    damping: 15,
    stiffness: 200,
  }),
}

export const cardFadeInInitial = {
  opacity: 0,
  scale: 0.95,
}

// Unlock vault spring animation
export const unlockVaultAnimation = {
  scale: withSpring(1, {
    damping: 12,
    stiffness: 200,
  }),
  rotate: withSpring(0, {
    damping: 15,
    stiffness: 250,
  }),
  opacity: withTiming(1, {
    duration: 200,
  }),
}

export const unlockVaultInitial = {
  scale: 0.8,
  rotate: -180,
  opacity: 0,
}

// Staggered list animations
export const createStaggeredAnimation = (index: number) => ({
  opacity: withTiming(1, {
    duration: 300,
    delay: index * 50,
    easing: Easing.out(Easing.ease),
  }),
  translateY: withTiming(0, {
    duration: 300,
    delay: index * 50,
    easing: Easing.out(Easing.ease),
  }),
})

export const staggeredInitial = {
  opacity: 0,
  translateY: 20,
}

// Modal animations
export const modalOverlayAnimation = {
  opacity: withTiming(1, {
    duration: 200,
    easing: Easing.out(Easing.ease),
  }),
}

export const modalOverlayInitial = {
  opacity: 0,
}

export const modalContentAnimation = {
  opacity: withTiming(1, {
    duration: 200,
    easing: Easing.out(Easing.ease),
  }),
  scale: withSpring(1, {
    damping: 15,
    stiffness: 300,
  }),
  translateY: withTiming(0, {
    duration: 200,
    easing: Easing.out(Easing.ease),
  }),
}

export const modalContentInitial = {
  opacity: 0,
  scale: 0.95,
  translateY: 20,
}

// Fade animations
export const fadeInAnimation = {
  opacity: withTiming(1, {
    duration: 300,
    easing: Easing.out(Easing.ease),
  }),
}

export const fadeInInitial = {
  opacity: 0,
}

// Slide animations
export const slideUpAnimation = {
  opacity: withTiming(1, {
    duration: 300,
    easing: Easing.out(Easing.ease),
  }),
  translateY: withTiming(0, {
    duration: 300,
    easing: Easing.out(Easing.ease),
  }),
}

export const slideUpInitial = {
  opacity: 0,
  translateY: 20,
}

export const slideDownAnimation = {
  opacity: withTiming(1, {
    duration: 300,
    easing: Easing.out(Easing.ease),
  }),
  translateY: withTiming(0, {
    duration: 300,
    easing: Easing.out(Easing.ease),
  }),
}

export const slideDownInitial = {
  opacity: 0,
  translateY: -20,
}

// Spring configs
export const springConfig = {
  damping: 15,
  stiffness: 300,
}

export const gentleSpringConfig = {
  damping: 20,
  stiffness: 200,
}

