import { useStore } from './index';

export { useStore };

useStore.subscribe((state) => {
  console.log('Renderer store updated:', state);
});

