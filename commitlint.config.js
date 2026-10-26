const commitlintConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 72], // 커밋 헤더(type + scope + subject) 72자 제한
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'style', 'chore', 'refactor', 'docs', 'test'],
    ], // 정한 타입(feat, fix, style, chore, refactor, docs, test)만 쓰도록 강제
    'type-case': [2, 'always', 'lower-case'], // type 소문자만
    'subject-case': [0], // 한글 커밋: 영어 대소문자 규칙은 꺼둠
    'type-empty': [2, 'never'], // 타입 강제 설정
    'scope-empty': [2, 'never'], // 스코프 강제 설정
    'subject-empty': [2, 'never'], // 제목 강제 설정
  },
};

export default commitlintConfig;
