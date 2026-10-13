'use client';

import { useEffect, useState } from 'react';
import { AuthApiError, requestPhoneCode, verifyPhoneCode } from '@/services/auth';
import { IconPhone, IconLock } from '@/components/Icons';

type Props = {
  onSuccess: (user: { id: number; role: string } | null) => void;
  onError: (message: string | null) => void;
};

export default function PhoneLoginForm({ onSuccess, onError }: Props) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeLength, setCodeLength] = useState(4);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const fail = (e: any) => {
    if (e instanceof AuthApiError && e.retryAfter) setCooldown(e.retryAfter);
    onError(e?.message || 'Не удалось выполнить запрос');
  };

  const sendCode = async () => {
    if (!phone.trim()) {
      onError('Введите номер телефона');
      return;
    }
    onError(null);
    setLoading(true);
    try {
      const res = await requestPhoneCode(phone);
      setCodeLength(res.codeLength || 4);
      setCooldown(res.retryAfter || 60);
      setStep('code');
      setCode('');
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!code.trim()) {
      onError('Введите код из SMS');
      return;
    }
    onError(null);
    setLoading(true);
    try {
      const res = await verifyPhoneCode(phone, code);
      onSuccess(res.user);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  };

  const submit = step === 'phone' ? sendCode : verify;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div className="field-label">Телефон</div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            className="input"
            placeholder="+7 900 000-00-00"
            type="tel"
            autoComplete="tel"
            value={phone}
            disabled={step === 'code'}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={{ paddingLeft: 42 }}
          />
          <div style={{ position: 'absolute', left: 14, color: 'var(--muted-light)', pointerEvents: 'none' }}>
            <IconPhone size={16} strokeWidth={1.6} />
          </div>
        </div>
      </div>

      {step === 'code' && (
        <div>
          <div className="field-label">Код из SMS</div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              className="input"
              placeholder={'•'.repeat(codeLength)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={codeLength}
              value={code}
              autoFocus
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              style={{ paddingLeft: 42, letterSpacing: 4 }}
            />
            <div style={{ position: 'absolute', left: 14, color: 'var(--muted-light)', pointerEvents: 'none' }}>
              <IconLock size={16} strokeWidth={1.6} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13 }}>
            <button
              type="button"
              className="muted"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              onClick={() => { setStep('phone'); onError(null); }}
            >
              Изменить номер
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || loading}
              onClick={sendCode}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: cooldown > 0 ? 'default' : 'pointer',
                color: cooldown > 0 ? 'var(--muted)' : 'var(--brand)',
              }}
            >
              {cooldown > 0 ? `Отправить снова через ${cooldown} с` : 'Отправить код снова'}
            </button>
          </div>
        </div>
      )}

      <button
        className="btn primary"
        onClick={submit}
        disabled={loading || (step === 'phone' && cooldown > 0)}
        style={{
          marginTop: 6,
          padding: '13px 20px',
          fontSize: 15,
          borderRadius: 'var(--radius-sm)',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading
          ? 'Подождите...'
          : step === 'phone'
            ? cooldown > 0 ? `Получить код (${cooldown} с)` : 'Получить код'
            : 'Войти'}
      </button>
    </div>
  );
}
