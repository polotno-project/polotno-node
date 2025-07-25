declare module 'polotno-node' {
  import { Browser, Page } from 'puppeteer';

  // Configuration Options for Asset Loading and Rendering
  export interface RenderOptions {
    ignoreBackground?: boolean;
    includeBleed?: boolean;
    quality?: number;
    pixelRatio?: number;
    assetLoadTimeout?: number;
    fontLoadTimeout?: number;
    htmlTextRenderEnabled?: boolean;
    textVerticalResizeEnabled?: boolean;
    textSplitAllowed?: boolean;
    textOverflow?: string;
    skipFontError?: boolean;
    skipImageError?: boolean;
    mimeType?: string;
    pageId?: string;
    onProgress?: (progress: number) => void;
  }

  export interface PDFRenderOptions extends RenderOptions {
    dpi?: number;
    parallel?: number;
    pageIds?: Array<string>;
    unit?: 'pt' | 'mm' | 'cm' | 'in';
    cropMarkSize?: number;
  }

  // JSON Structure for Rendering
  export interface RenderJSON {
    [key: string]: any;
  }

  // Browser Creation Options
  export interface BrowserOptions {
    browserArgs?: string[];
    headless?: 'new' | boolean;
    protocolTimeout?: number;
    ignoreHTTPSErrors?: boolean;
    executablePath?: string;
  }

  // Instance Creation Options
  export interface InstanceOptions {
    key?: string;
    url?: string;
    useParallelPages?: boolean;
    browserArgs?: string[];
    browser?: Browser;
  }

  // Polotno Node Instance
  export interface PolotnoInstance {
    close: () => Promise<void>;
    firstPage: Page | null;
    browser: Browser;
    run: (
      func: (json: RenderJSON, options?: RenderOptions) => Promise<any>,
      ...args: any[]
    ) => Promise<any>;
    jsonToDataURL: (
      json: RenderJSON,
      options?: RenderOptions
    ) => Promise<string>;
    jsonToImageBase64: (
      json: RenderJSON,
      options?: RenderOptions
    ) => Promise<string>;
    jsonToPDFDataURL: (
      json: RenderJSON,
      options?: PDFRenderOptions
    ) => Promise<string>;
    jsonToPDFBase64: (
      json: RenderJSON,
      options?: PDFRenderOptions
    ) => Promise<string>;
    jsonToBlob: (json: RenderJSON, options?: RenderOptions) => Promise<Buffer>;
    jsonToGIFDataURL: (
      json: RenderJSON,
      options?: RenderOptions
    ) => Promise<string>;
    jsonToGIFBase64: (
      json: RenderJSON,
      options?: RenderOptions
    ) => Promise<string>;
    createPage: () => Promise<Page>;
  }

  // Main Module Exports
  export function createBrowser(options?: BrowserOptions): Promise<Browser>;

  export function createInstance(
    options?: InstanceOptions
  ): Promise<PolotnoInstance>;

  // Exported Module Functions
  export function createPage(browser: Browser, url: string): Promise<Page>;
  export function run(page: Page, func: () => void, args: any[]): Promise<any>;
  export function jsonToDataURL(
    page: Page,
    json: RenderJSON,
    attrs?: RenderOptions
  ): Promise<string>;
  export function jsonToPDFDataURL(
    page: Page,
    json: RenderJSON,
    attrs?: PDFRenderOptions
  ): Promise<string>;
  export function jsonToBlob(
    page: Page,
    json: RenderJSON,
    attrs?: RenderOptions
  ): Promise<Buffer>;
}
