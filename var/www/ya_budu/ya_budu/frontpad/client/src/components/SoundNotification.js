import React, { useRef, useEffect, useState } from 'react';

// Sound notification component
const SoundNotification = ({ type = 'notification', enabled = true }) => {
  const htmlAudioRef = useRef(null);
  const [audioReady, setAudioReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    // Create audio element for MP3 playback
    try {
      htmlAudioRef.current = new Audio('/sounds/notification.mp3');
      htmlAudioRef.current.volume = 0.5;
      setAudioReady(true);
      console.log('SoundNotification: AudioElement готов');
    } catch (e) {
      console.error('SoundNotification: Ошибка создания Audio:', e);
    }
  }, []);

  // Функция для включения звука
  const enableSound = async () => {
    const audio = htmlAudioRef.current;
    if (!audio) return;
    
    try {
      // Try to play and pause to unlock audio on mobile browsers
      await audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      });
      setSoundEnabled(true);
      console.log('SoundNotification: Звук включён');
    } catch (e) {
      console.error('SoundNotification: Не удалось включить звук:', e);
    }
  };

  // Проверяем доступность звука при монтировании
  useEffect(() => {
    const audio = htmlAudioRef.current;
    if (audio) {
      // Check if audio can play (was previously unlocked)
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        setSoundEnabled(true);
      }).catch(() => {
        // Audio not yet unlocked
      });
    }
  }, []);

  const playSound = async (soundType) => {
    if (!enabled) return;
    
    const audio = htmlAudioRef.current;
    if (!audio) {
      console.error('SoundNotification: AudioElement не существует');
      return;
    }

    try {
      // Reset to beginning
      audio.currentTime = 0;
      // Play the sound
      await audio.play();
      console.log('SoundNotification: Играет звук уведомления');
    } catch (e) {
      console.error('SoundNotification: Не удалось воспроизвести звук:', e);
    }
  };

  useEffect(() => {
    // Listen for custom sound events
    const handleSound = (e) => {
      // Играем звук для любого типа события (global, order, message и т.д.)
      if (e.detail && e.detail.sound) {
        console.log('SoundNotification: Получена команда играть звук:', e.detail.sound);
        playSound(e.detail.sound);
      }
    };

    window.addEventListener('play-sound', handleSound);
    return () => window.removeEventListener('play-sound', handleSound);
  }, [type, enabled]);

  // Кнопка включения звука
  if (audioReady && !soundEnabled) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999
      }}>
        <button
          onClick={enableSound}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          🔊 Включить звук
        </button>
      </div>
    );
  }

  return null; // Silent component
};

export const playNotificationSound = (soundType = 'notification') => {
  const event = new CustomEvent('play-sound', { detail: { type: 'global', sound: soundType } });
  window.dispatchEvent(event);
};

export default SoundNotification;
