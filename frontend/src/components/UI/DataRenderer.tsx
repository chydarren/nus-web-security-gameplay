import React from 'react';

interface DataRendererProps {
  data: any;
  label?: string;
  level?: number;
  maxLevel?: number;
}

export const DataRenderer: React.FC<DataRendererProps> = ({ 
  data, 
  label, 
  level = 0, 
  maxLevel = 3 
}) => {
  // Prevent infinite recursion
  if (level > maxLevel) {
    return <span className="text-gray-500 italic">Max depth reached</span>;
  }

  const getValueClass = (value: any): string => {
    if (typeof value === 'number') {
      if (value > 0) return 'text-green-600 font-semibold';
      if (value < 0) return 'text-red-600 font-semibold';
      return 'text-gray-600 font-medium';
    }
    if (typeof value === 'boolean') {
      return value ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
    }
    return 'text-gray-800 font-medium';
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'number') {
      // Check if it's likely a percentage (0-1 range and contains probability/rate keywords)
      if (value >= 0 && value <= 1 && label && 
          (label.toLowerCase().includes('probability') || 
           label.toLowerCase().includes('rate') || 
           label.toLowerCase().includes('chance'))) {
        return `${Math.round(value * 100)}%`;
      }
      
      // Check if it's already a percentage or level (usually 0-100 range)
      if (label && 
          (label.toLowerCase().includes('level') || 
           label.toLowerCase().includes('security') ||
           label.toLowerCase().includes('percentage') ||
           label.toLowerCase().includes('percent'))) {
        return `${Math.round(value)}${label.toLowerCase().includes('level') ? '' : '%'}`;
      }
      
      // Format floating point numbers
      if (value % 1 !== 0) {
        return Number(value.toFixed(2)).toString();
      }
      
      return value.toString();
    }
    
    if (typeof value === 'boolean') {
      return value ? '✓ Yes' : '✗ No';
    }
    
    if (typeof value === 'string') {
      // Capitalize first letter and replace underscores
      return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
    }
    
    return String(value);
  };

  const formatLabel = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  };

  const renderPrimitive = (value: any, key?: string) => {
    const displayLabel = label || (key ? formatLabel(key) : '');
    const formattedValue = formatValue(value);
    const valueClass = getValueClass(value);

    return (
      <div className="flex justify-between items-center py-1">
        <span className="text-gray-700 text-sm">{displayLabel}:</span>
        <span className={`text-sm ${valueClass}`}>{formattedValue}</span>
      </div>
    );
  };

  const renderArray = (arr: any[], key?: string) => {
    const displayLabel = label || (key ? formatLabel(key) : '');
    
    if (arr.length === 0) {
      return (
        <div className="py-1">
          <span className="text-gray-700 text-sm">{displayLabel}:</span>
          <span className="text-gray-500 italic text-sm ml-2">Empty</span>
        </div>
      );
    }

    return (
      <div className="py-1">
        <div className="text-gray-700 text-sm font-medium mb-1">{displayLabel}:</div>
        <div className="ml-3 space-y-1 border-l-2 border-gray-200 pl-3">
          {arr.map((item, index) => (
            <DataRenderer 
              key={index} 
              data={item} 
              label={`${index + 1}`} 
              level={level + 1}
              maxLevel={maxLevel}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderObject = (obj: Record<string, any>, key?: string) => {
    const displayLabel = label || (key ? formatLabel(key) : '');
    const entries = Object.entries(obj);
    
    if (entries.length === 0) {
      return level === 0 ? null : (
        <div className="py-1">
          <span className="text-gray-700 text-sm">{displayLabel}:</span>
          <span className="text-gray-500 italic text-sm ml-2">Empty</span>
        </div>
      );
    }

    return (
      <div className={level === 0 ? "" : "py-1"}>
        {displayLabel && level > 0 && (
          <div className="text-gray-700 text-sm font-medium mb-1">{displayLabel}:</div>
        )}
        <div className={level > 0 ? "ml-3 border-l-2 border-gray-200 pl-3 space-y-1" : "space-y-1"}>
          {entries.map(([objKey, objValue]) => (
            <DataRenderer 
              key={objKey} 
              data={objValue} 
              label={formatLabel(objKey)} 
              level={level + 1}
              maxLevel={maxLevel}
            />
          ))}
        </div>
      </div>
    );
  };

  // Handle null or undefined
  if (data === null || data === undefined) {
    const displayLabel = label || 'Value';
    return (
      <div className="flex justify-between items-center py-1">
        <span className="text-gray-700 text-sm">{displayLabel}:</span>
        <span className="text-gray-500 italic text-sm">N/A</span>
      </div>
    );
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return renderArray(data);
  }

  // Handle objects
  if (typeof data === 'object') {
    return renderObject(data);
  }

  // Handle primitives (string, number, boolean)
  return renderPrimitive(data);
};

export default DataRenderer;