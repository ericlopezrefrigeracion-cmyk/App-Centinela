import { useWindowDimensions } from 'react-native';

// Breakpoints simples para adaptar el layout, pensado 100% para celular, a tablet/desktop
// cuando la app corre como webapp. Funciona igual en RN nativo (por si alguna vez vuelve a
// haber un build nativo) porque useWindowDimensions existe en ambos.
export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  const breakpoint: Breakpoint = width < 600 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
  return {
    width,
    breakpoint,
    esMobile:  breakpoint === 'mobile',
    esTablet:  breakpoint === 'tablet',
    esDesktop: breakpoint === 'desktop',
  };
}
