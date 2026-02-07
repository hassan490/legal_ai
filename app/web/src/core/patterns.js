export const DATE_PATTERN =
  /\b(\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{4}-\d{2}-\d{2})\b/g;

export const COMPANY_PATTERN =
  /\b([A-Z][A-Za-z0-9&,\.\s]{2,}?\s+(Private Limited|Limited|Ltd\.|LLP|Inc\.|Corporation|Company))\b/;

export const ARTICLE_PATTERN = /^(article|clause|section)\s+\d+/i;

export const REGISTERED_OFFICE_PATTERN =
  /(registered office|registered address|principal office)[:\-]?\s*(.+)/i;

export const EMAIL_HEADER_PATTERN = /^(email|from|to|subject|date)\b/i;

export const ADDRESS_BREAK_PATTERN =
  /^(please|authorize|best|regards|noted|for the record)\b/i;
