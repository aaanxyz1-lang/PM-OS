import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check } from 'lucide-react';

const COLOR_PRESETS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#64748b', // slate
  '#6b7280', // gray
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {COLOR_PRESETS.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className="relative w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
            style={{
              backgroundColor: color,
              borderColor: value === color ? '#000' : '#e2e8f0',
            }}
          >
            {value === color && (
              <Check className="h-4 w-4 absolute inset-0 m-auto text-white drop-shadow" />
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 p-1 cursor-pointer"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 font-mono text-sm"
        />
      </div>
    </div>
  );
}
