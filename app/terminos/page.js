import { readFileSync } from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import { LegalPageWrapper } from '@/components/legal-page-wrapper.js';

function getContent() {
  const filePath = path.join(process.cwd(), 'docs', 'legal', 'terminos.md');
  return readFileSync(filePath, 'utf-8');
}

export default function TerminosPage() {
  const content = getContent();
  return (
    <LegalPageWrapper alternatePath="/terms" langLabel="English">
      <ReactMarkdown>{content}</ReactMarkdown>
    </LegalPageWrapper>
  );
}
