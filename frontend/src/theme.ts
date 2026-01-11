import { createTheme } from '@mantine/core';

export const theme = createTheme({
  fontFamily: '"Plus Jakarta Sans", sans-serif',
  headings: {
    fontFamily: '"Space Grotesk", sans-serif',
    fontWeight: '700'
  },
  primaryColor: 'brand',
  defaultRadius: 'md',
  colors: {
    brand: [
      '#e7fbf7',
      '#d2f5ed',
      '#a6eadc',
      '#79dec9',
      '#52d3b8',
      '#35c9aa',
      '#1fb197',
      '#168a76',
      '#0e6254',
      '#073c34'
    ]
  }
});
