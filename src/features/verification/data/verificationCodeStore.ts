interface StoredVerificationCode {
  code: string;
  expiresAt: number;
}

let activeVerificationCode: StoredVerificationCode | null = null;

export function saveVerificationCode(code: string, ttlSeconds = 300): void {
  activeVerificationCode = {
    code,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };
}

export function clearVerificationCode(): void {
  activeVerificationCode = null;
}

function getActiveVerificationCode(): StoredVerificationCode | null {
  if (!activeVerificationCode) {
    return null;
  }

  if (Date.now() >= activeVerificationCode.expiresAt) {
    activeVerificationCode = null;
    return null;
  }

  return activeVerificationCode;
}

export function validateVerificationCode(code: string): string | null {
  const storedCode = getActiveVerificationCode();

  if (!storedCode) {
    return 'Prvo generišite jednokratnu lozinku na ekranu Verifikacija.';
  }

  if (storedCode.code !== code.trim()) {
    return 'Uneti verifikacioni kod nije ispravan.';
  }

  return null;
}
