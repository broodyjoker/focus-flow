import math, wave, base64, io

def gen_wav(f, dur):
    b = io.BytesIO()
    w = wave.open(b, 'wb')
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(44100)
    
    frames = bytearray()
    for i in range(int(44100 * dur)):
        val = int(32767 * math.sin(2 * math.pi * f * i / 44100) * math.exp(-i/(44100*dur/2)))
        frames.extend(val.to_bytes(2, 'little', signed=True))
        
    w.writeframes(frames)
    w.close()
    return 'data:audio/wav;base64,' + base64.b64encode(b.getvalue()).decode()

tick = gen_wav(800, 0.05)
chime = gen_wav(523.25, 0.5)

out = f"""export const TICK_SOUND = "{tick}";
export const CHIME_SOUND = "{chime}";

export function playSound(type: 'tick' | 'chime', isEnabled: boolean) {{
  if (!isEnabled) return;
  
  try {{
    const audio = new Audio(type === 'tick' ? TICK_SOUND : CHIME_SOUND);
    audio.play().catch(e => console.warn('Audio play prevented', e));
  }} catch (e) {{
    console.warn('Audio play error', e);
  }}
}}
"""

with open('src/utils/audio.ts', 'w') as f:
    f.write(out)
