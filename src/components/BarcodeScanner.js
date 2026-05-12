import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const BarcodeScanner = ({ onScanSuccess }) => {
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: {
        width: 250,
        height: 250,
      },
      fps: 5,
    });

    scanner.render(success, error);

    function success(result) {
      scanner.clear();
      setScanResult(result);
      if (onScanSuccess) onScanSuccess(result);
    }

    function error(err) {
      // console.warn(err);
    }

    return () => {
      scanner.clear().catch(e => console.error("Scanner clear failed", e));
    };
  }, [onScanSuccess]);

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center' }}>Scan SKU Barcode</h2>
      {scanResult ? (
        <div style={{ textAlign: 'center', padding: '20px', background: '#d1fae5', borderRadius: '8px' }}>
          Success: {scanResult}
        </div>
      ) : (
        <div id="reader"></div>
      )}
    </div>
  );
};

export default BarcodeScanner;
