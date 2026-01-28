'use client';

import { useState } from 'react';
import { FiX } from 'react-icons/fi';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  title: string;
  fields: Array<{
    name: string;
    label: string;
    type?: 'text' | 'textarea' | 'color';
    placeholder?: string;
    required?: boolean;
  }>;
  initialValue?: string;
}

export default function QuickAddModal({
  isOpen,
  onClose,
  onSave,
  title,
  fields,
  initialValue,
}: QuickAddModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.name === 'name' && initialValue) {
        initial[field.name] = initialValue;
      } else if (field.name === 'hex_code') {
        initial[field.name] = '#000000';
      } else {
        initial[field.name] = '';
      }
    });
    return initial;
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
      // Reset form
      const reset: Record<string, string> = {};
      fields.forEach((field) => {
        if (field.name === 'hex_code') {
          reset[field.name] = '#000000';
        } else {
          reset[field.name] = '';
        }
      });
      setFormData(reset);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required !== false && <span className="text-red-500">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  className="input"
                  rows={3}
                  value={formData[field.name] || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.name]: e.target.value })
                  }
                  placeholder={field.placeholder}
                  required={field.required !== false}
                />
              ) : field.type === 'color' ? (
                <div className="flex gap-2">
                  <input
                    id={field.name}
                    name={field.name}
                    type="color"
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                    value={formData[field.name] || '#000000'}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.name]: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    className="input flex-1"
                    value={formData[field.name] || '#000000'}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.name]: e.target.value })
                    }
                    placeholder="#000000"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type="text"
                  className="input"
                  value={formData[field.name] || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.name]: e.target.value })
                  }
                  placeholder={field.placeholder}
                  required={field.required !== false}
                />
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline flex-1"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
