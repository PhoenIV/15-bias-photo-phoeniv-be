import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

// API 명세 원본: docs/openapi.yaml (명세를 바꿀 때는 이 파일을 수정)
const specPath = path.join(import.meta.dirname, '../../docs/openapi.yaml');

export const swaggerSpec = parse(readFileSync(specPath, 'utf8'));
