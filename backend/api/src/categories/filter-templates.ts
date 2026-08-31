import rawTemplates from './filter-templates.generated.json';

export type FilterTemplateField = {
  key: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTISELECT';
  unit: string | null;
  options: string[] | null;
  required: boolean;
  filterable: boolean;
  showInForm: boolean;
  sortOrder: number;
};

export type FilterTemplateNode = {
  name: string;
  templateKey: string;
  fields: FilterTemplateField[];
  children: FilterTemplateNode[];
};

export type FilterTemplate = {
  profile: string;
  name: string;
  source: string;
  root: FilterTemplateNode;
};

export const FILTER_TEMPLATES = rawTemplates as FilterTemplate[];

export const FILTER_PROFILES = [
  { value: 'NONE', label: 'Без дополнительных параметров' },
  { value: 'AUTO', label: 'Авто' },
  ...FILTER_TEMPLATES.map(({ profile, name }) => ({ value: profile, label: name })),
];
