import { readFileSync } from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import { LegalPageWrapper } from '@/components/legal-page-wrapper.js';

function getContent() {
  const filePath = path.join(process.cwd(), 'docs', 'legal', 'privacy.md');
  return readFileSync(filePath, 'utf-8');
}

export default function PrivacyPage() {
  const content = getContent();
  return (
    <LegalPageWrapper alternatePath="/privacidad" langLabel="Español">
      <ReactMarkdown>{content}</ReactMarkdown>
    </LegalPageWrapper>
  );
}
