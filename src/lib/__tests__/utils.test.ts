import { cn } from '@/lib/utils';

describe('cn utility function', () => {
  it('combines class names correctly', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('merges conflicting Tailwind classes', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const isFocused = false;
    
    const result = cn(
      'base-class',
      isActive && 'active-class',
      isFocused && 'focused-class'
    );
    
    expect(result).toBe('base-class active-class');
  });

  it('handles empty inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles null and undefined inputs', () => {
    const result = cn('text-red-500', null, undefined, 'bg-blue-500');
    expect(result).toBe('text-red-500 bg-blue-500');
  });
});
