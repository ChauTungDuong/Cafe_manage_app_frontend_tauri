declare module "@tauri-apps/plugin-dialog" {
  export interface DialogFilter {
    name: string;
    extensions: string[];
  }

  export interface SaveDialogOptions {
    defaultPath?: string;
    title?: string;
    filters?: DialogFilter[];
  }

  export function save(options?: SaveDialogOptions): Promise<string | null>;
}

declare module "@tauri-apps/plugin-fs" {
  export function writeFile(
    path: string,
    contents: Uint8Array,
    options?: any
  ): Promise<void>;
}

declare module "@tauri-apps/api/dialog" {
  export interface DialogFilter {
    name: string;
    extensions: string[];
  }

  export interface SaveDialogOptions {
    defaultPath?: string;
    title?: string;
    filters?: DialogFilter[];
  }

  export function save(options?: SaveDialogOptions): Promise<string | null>;
}

declare module "@tauri-apps/api/fs" {
  export function writeBinaryFile(opts: {
    path: string;
    contents: Uint8Array;
  }): Promise<void>;
}
