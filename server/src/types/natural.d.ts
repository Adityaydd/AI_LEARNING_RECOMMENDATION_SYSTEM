declare module 'natural/lib/natural/tfidf/tfidf.js' {
  export interface TfIdfTerm {
    term: string;
    tfidf: number;
  }

  export default class TfIdf {
    constructor();
    addDocument(document: string): void;
    listTerms(documentIndex: number): TfIdfTerm[];
    tfidf(term: string, documentIndex: number): number;
  }
}