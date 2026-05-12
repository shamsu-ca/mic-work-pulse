import React, { useState, useEffect, useRef } from 'react';

export default function ClockTimePicker({ value, onChange, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('hour'); // 'hour' or 'minute'
  
  // Parse incoming value "HH:mm"
  const parseTime = (val) => {
    if (!val) return { h: 12, m: 0, isAm: true };
    const [hrStr, minStr] = val.split(':');
    let h24 = parseInt(hrStr, 10);
    let m = parseInt(minStr, 10);
    if (isNaN(h24)) h24 = 12;
    if (isNaN(m)) m = 0;
    
    const isAm = h24 < 12;
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { h: h12, m, isAm };
  };

  const [time, setTime] = useState(parseTime(value));
  const containerRef = useRef(null);

  useEffect(() => {
    if (value) setTime(parseTime(value));
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleHourClick = (h) => {
    setTime({ ...time, h });
    setMode('minute');
  };

  const handleMinuteClick = (m) => {
    setTime({ ...time, m });
  };

  const handleOk = () => {
    let h24 = time.h;
    if (time.isAm && h24 === 12) h24 = 0;
    if (!time.isAm && h24 !== 12) h24 += 12;
    
    const hh = h24.toString().padStart(2, '0');
    const mm = time.m.toString().padStart(2, '0');
    onChange(`${hh}:${mm}`);
    setIsOpen(false);
  };

  const displayTime = () => {
    if (!value) return '';
    const { h, m, isAm } = parseTime(value);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${isAm ? 'AM' : 'PM'}`;
  };

  const renderClockFace = () => {
    const items = mode === 'hour' 
      ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
      
    const radius = 100;
    const center = 120;
    
    return (
      <div className="relative w-[240px] h-[240px] bg-surface-container-low rounded-full mx-auto my-4 flex items-center justify-center">
        {/* Center dot */}
        <div className="w-2 h-2 bg-primary rounded-full absolute z-10"></div>
        
        {/* Line indicator */}
        <div 
          className="absolute bg-primary origin-bottom"
          style={{
            width: 2,
            height: radius - 15,
            bottom: center,
            left: center - 1,
            transform: `rotate(${mode === 'hour' ? (time.h * 30) : (time.m * 6)}deg)`,
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
           <div className="w-8 h-8 rounded-full bg-primary/20 absolute -top-4 -left-[15px]"></div>
        </div>

        {items.map((num, i) => {
          // Angle in radians (start at 12 o'clock, which is -90 deg)
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x = center + radius * Math.cos(angle) - 16;
          const y = center + radius * Math.sin(angle) - 16;
          
          const isSelected = mode === 'hour' ? time.h === (num === 0 ? 12 : num) : time.m === num;
          
          return (
            <button
              key={num}
              type="button"
              onClick={() => mode === 'hour' ? handleHourClick(num === 0 ? 12 : num) : handleMinuteClick(num)}
              className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors z-20 ${isSelected ? 'text-white' : 'text-on-surface hover:bg-surface-container-high'}`}
              style={{ left: x, top: y }}
            >
              {mode === 'minute' ? num.toString().padStart(2, '0') : num}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className={`${className} cursor-pointer flex justify-between items-center`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && !value) {
            setTime(parseTime('10:00')); // Default when opened empty
            setMode('hour');
          }
        }}
      >
        <span className={value ? "text-on-surface" : "text-on-surface-variant"}>
          {value ? displayTime() : "Select time"}
        </span>
        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">schedule</span>
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-2 bg-white rounded-2xl shadow-xl border border-outline-variant/30 p-5 w-[280px]" style={{ right: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-end gap-1 text-4xl font-light text-on-surface">
              <span 
                className={`cursor-pointer rounded-lg px-1 transition-colors ${mode === 'hour' ? 'text-primary bg-primary/10 font-medium' : 'hover:bg-surface-container-low'}`}
                onClick={() => setMode('hour')}
              >
                {time.h.toString().padStart(2, '0')}
              </span>
              <span className="text-outline-variant mb-1">:</span>
              <span 
                className={`cursor-pointer rounded-lg px-1 transition-colors ${mode === 'minute' ? 'text-primary bg-primary/10 font-medium' : 'hover:bg-surface-container-low'}`}
                onClick={() => setMode('minute')}
              >
                {time.m.toString().padStart(2, '0')}
              </span>
            </div>
            
            <div className="flex flex-col border border-outline-variant/50 rounded-lg overflow-hidden text-sm font-bold">
              <button 
                type="button" 
                className={`px-3 py-1.5 ${time.isAm ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'}`}
                onClick={() => setTime({...time, isAm: true})}
              >AM</button>
              <div className="h-px bg-outline-variant/50"></div>
              <button 
                type="button" 
                className={`px-3 py-1.5 ${!time.isAm ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'}`}
                onClick={() => setTime({...time, isAm: false})}
              >PM</button>
            </div>
          </div>

          {/* Clock Face */}
          {renderClockFace()}

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors" onClick={() => setIsOpen(false)}>Cancel</button>
            <button type="button" className="px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors" onClick={handleOk}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
