
export type Page = 'home' | 'philosophy' | 'services' | 'caseStudies' | 'contact' | 'analysis';

export interface CaseStudy {
  client: string;
  challenge: string;
  solution: string;
  result: string;
  image: string;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}
