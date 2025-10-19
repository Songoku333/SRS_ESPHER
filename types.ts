export type Page = 'home' | 'philosophy' | 'services' | 'caseStudies' | 'contact' | 'analysis';

export interface CaseStudy {
  client: string;
  challenge: string;
  solution: string;
  result: string;
  image: string;
}