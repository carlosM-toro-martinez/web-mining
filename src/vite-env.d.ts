/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module "*.pptx" {
  const src: string;
  export default src;
}
