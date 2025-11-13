'use client'

import { useState, useEffect, useRef } from 'react'
import { Camera, X, Check } from 'lucide-react'

export default function QRScanner({ onScan }: { onScan: (qrCode: string) => void }) {
  const [isScanning, setIsScanning] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<any>(null)
  const scanAreaId = 'qr-reader'

  const startScanning = async () => {
    try {
      setError(null)
      // Динамический импорт для избежания SSR проблем
      const { Html5Qrcode } = await import('html5-qrcode')
      const html5QrCode = new Html5Qrcode(scanAreaId)
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          setQrCode(decodedText)
          html5QrCode.stop()
          setIsScanning(false)
          onScan(decodedText)
        },
        (errorMessage) => {
          // Игнорируем ошибки сканирования
        }
      )
      setIsScanning(true)
    } catch (err) {
      setError('Не удалось запустить камеру. Убедитесь, что у вас есть разрешение на использование камеры.')
      setIsScanning(false)
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (err) {
        // Игнорируем ошибки остановки
      }
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  const handleManualInput = () => {
    if (qrCode.trim()) {
      onScan(qrCode.trim())
      setQrCode('')
    }
  }

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Сканировать чек</h2>
        {isScanning && (
          <button
            onClick={stopScanning}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {!isScanning ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Или введите QR-код вручную:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="Вставьте QR-код из чека"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
              <button
                onClick={handleManualInput}
                disabled={!qrCode.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Обработать
              </button>
            </div>
          </div>

          <button
            onClick={startScanning}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Запустить сканер
          </button>
        </div>
      ) : (
        <div>
          <div id={scanAreaId} className="w-full max-w-md mx-auto"></div>
          <p className="text-center text-gray-600 mt-4">
            Наведите камеру на QR-код чека
          </p>
        </div>
      )}
    </div>
  )
}

