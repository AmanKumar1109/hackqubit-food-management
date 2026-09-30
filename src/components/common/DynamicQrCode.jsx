import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export const DynamicQrCode = ({
  value,
  size = 144,
  className = '',
  bgColor = '#ffffff',
  fgColor = '#0a0b0e'
}) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!value) {
      setQrDataUrl('');
      return;
    }

    QRCode.toDataURL(String(value), {
      width: size * 2, // 2x for sharp retina display
      margin: 1,
      color: {
        dark: fgColor,
        light: bgColor
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => {
        setQrDataUrl(url);
        setError(false);
      })
      .catch((err) => {
        console.error('Failed to generate QR Code:', err);
        setError(true);
      });
  }, [value, size, bgColor, fgColor]);

  if (error || !qrDataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-neutral-100 rounded-2xl flex items-center justify-center p-2 text-center text-[10px] text-neutral-400 font-mono ${className}`}
      >
        {value || 'Generating QR...'}
      </div>
    );
  }

  return (
    <img
      src={qrDataUrl}
      alt={`QR Code for ${value}`}
      style={{ width: size, height: size }}
      className={`rounded-xl object-contain shadow-xs ${className}`}
    />
  );
};

export default DynamicQrCode;
