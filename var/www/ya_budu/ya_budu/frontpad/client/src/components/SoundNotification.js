import React, { useRef, useEffect, useState } from 'react';

// Sound notification component
const SoundNotification = ({ type = 'notification', enabled = true }) => {
  const audioRef = useRef(null);
  const [audioReady, setAudioReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    // Create audio context for generating sounds
    try {
      audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
      setAudioReady(true);
      console.log('SoundNotification: AudioContext готов');
    } catch (e) {
      console.error('SoundNotification: Ошибка создания AudioContext:', e);
    }
  }, []);

  // Функция для включения звука
  const enableSound = async () => {
    const audioCtx = audioRef.current;
    if (!audioCtx) return;
    
    try {
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      setSoundEnabled(true);
      console.log('SoundNotification: Звук включён');
    } catch (e) {
      console.error('SoundNotification: Не удалось включить звук:', e);
    }
  };

  // Проверяем доступность звука при монтировании
  useEffect(() => {
    const audioCtx = audioRef.current;
    if (audioCtx && audioCtx.state === 'running') {
      setSoundEnabled(true);
    }
  }, []);

  const playSound = async (soundType) => {
    if (!enabled) return;
    
    const audioCtx = audioRef.current;
    if (!audioCtx) {
      console.error('SoundNotification: AudioContext не существует');
      return;
    }

    // Resume audio context if suspended (browser requires user interaction)
    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
        console.log('SoundNotification: AudioContext возобновлён');
      } catch (e) {
        console.error('SoundNotification: Не удалось возобновить AudioContext:', e);
      }
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (soundType === 'order') {
      // Ding-dong sound for orders
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
      
      // Second tone
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(783.99, audioCtx.currentTime); // G5
        gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.4);
      }, 200);
    } else if (soundType === 'message') {
      // Message sound - soft ding
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    }
  };

  useEffect(() => {
    // Listen for custom sound events
    const handleSound = (e) => {
      // Играем звук для любого типа события (global, order, message и т.д.)
      if (e.detail && e.detail.sound) {
        console.log('SoundNotification: Полу команда играть звук:', e.detail.sound);
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
