/**
 * Канал доставки одноразового кода (SMS, звонок-код, мессенджер и т.п.).
 * Чтобы подключить нового провайдера, достаточно реализовать этот интерфейс
 * и добавить его в фабрику в otp-sender.factory.ts.
 */
export interface OtpSender {
  readonly name: string;
  /** phone — нормализованный номер вида 79XXXXXXXXX */
  send(phone: string, code: string): Promise<void>;
}

export const OTP_SENDER = Symbol('OTP_SENDER');
