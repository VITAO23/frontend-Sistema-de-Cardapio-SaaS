declare module 'qrcode' {
  export type QRCodeToDataURLOptions = {
    width?: number;
    margin?: number;
  };

  export function toDataURL(
    text: string,
    options?: QRCodeToDataURLOptions,
  ): Promise<string>;

  const QRCode: {
    toDataURL: typeof toDataURL;
  };

  export default QRCode;
}
