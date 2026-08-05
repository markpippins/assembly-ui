/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly ASSEMBLY_MODE?: string;
  readonly VITE_ASSEMBLY_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
