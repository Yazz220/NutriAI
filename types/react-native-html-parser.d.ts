declare module 'react-native-html-parser' {
  export class DOMParser {
    constructor();
    parseFromString(html: string, mimeType: string): Document;
  }
}
