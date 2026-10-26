export class TestService {
  async getSecretData() {
    // 테스트 1: 민감 정보(비밀번호) 하드코딩 노출
    const adminPassword = 'cloud-password-123!';

    // 테스트 2: try-catch가 없는 상태에서 강제로 비동기 에러(Promise.reject) 유발
    const result = await Promise.reject(new Error('강제 네트워크 에러 발생'));

    return { adminPassword, result };
  }
}
