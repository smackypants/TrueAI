/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react/jsx-runtime" />

declare const GITHUB_RUNTIME_PERMANENT_NAME: string
declare const BASE_KV_SERVICE_URL: string

declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.svg?url' {
  const content: string
  export default content
}

declare module '*.json' {
  const content: any
  export default content
}

// Global spark declaration
declare const spark: {
  kv: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
}