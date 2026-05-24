import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';

// ==========================================
// 1. FORM INPUT
// ==========================================
interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  error?: string;
  editable?: boolean;
}

export function FormInput({
  label,
  value,
  onChangeText,
  placeholder = '',
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  editable = true,
}: FormInputProps) {
  const [showValue, setShowValue] = useState(false);

  return (
    <View style={formStyles.field}>
      <Text style={formStyles.label}>{label}</Text>
      <View style={[
        formStyles.inputContainer,
        error ? formStyles.inputError : null,
        !editable && formStyles.inputDisabled,
      ]}>
        <TextInput
          style={[
            formStyles.inputInside,
            !editable && formStyles.inputDisabledText,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#475569"
          secureTextEntry={secureTextEntry && !showValue}
          keyboardType={keyboardType}
          editable={editable}
          {...Platform.select({
            web: {
              outlineStyle: 'none',
            } as any,
          })}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={formStyles.eyeButton}
            onPress={() => setShowValue(!showValue)}
            activeOpacity={0.7}
            disabled={!editable}
          >
            <Text style={formStyles.eyeIcon}>{showValue ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={formStyles.errorText}>{error}</Text>}
    </View>
  );
}


// ==========================================
// 2. FORM SELECT (CUSTOM MODAL-BASED SELECTOR)
// ==========================================
interface FormSelectProps {
  label: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  error?: string;
  searchable?: boolean;
}

export function FormSelect({
  label,
  selectedValue,
  onValueChange,
  options,
  placeholder = 'Pilih salah satu...',
  error,
  searchable = false,
}: FormSelectProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Find active label
  const selectedOption = options.find((opt) => opt.value === selectedValue);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (val: string) => {
    onValueChange(val);
    setIsExpanded(false);
    setSearchQuery('');
  };

  const filteredOptions = searchable
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  if (Platform.OS === 'web') {
    return (
      <View style={formStyles.field}>
        <Text style={formStyles.label}>{label}</Text>
        <div style={{ position: 'relative', width: '100%', pointerEvents: 'auto' }}>
          <select
            value={selectedValue || ''}
            onChange={(e) => onValueChange(e.target.value)}
            style={{
              backgroundColor: '#0F172A',
              borderColor: error ? '#EF4444' : '#334155',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '10px',
              color: '#FFF',
              padding: '10px 32px 10px 14px',
              fontSize: '14px',
              height: '44px',
              width: '100%',
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              pointerEvents: 'auto',
            }}
          >
            <option value="" disabled style={{ backgroundColor: '#1E293B', color: '#64748B' }}>
              {placeholder}
            </option>
            {options.map((opt, idx) => (
              <option 
                key={`${opt.value}-${idx}`} 
                value={opt.value} 
                style={{ backgroundColor: '#1E293B', color: '#FFF' }}
              >
                {opt.label}
              </option>
            ))}
          </select>
          <span 
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748B',
              fontSize: '10px',
              pointerEvents: 'none',
            }}
          >
            ▼
          </span>
        </div>
        {error && <Text style={formStyles.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={formStyles.field}>
      <Text style={formStyles.label}>{label}</Text>
      
      <TouchableOpacity
        style={[formStyles.selectButton, error ? formStyles.inputError : null]}
        onPress={() => {
          setIsExpanded(!isExpanded);
          if (isExpanded) setSearchQuery('');
        }}
        activeOpacity={0.7}
      >
        <Text style={[formStyles.selectButtonText, !selectedOption && formStyles.selectPlaceholder]}>
          {displayText}
        </Text>
        <Text style={formStyles.selectArrow}>{isExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {error && <Text style={formStyles.errorText}>{error}</Text>}

      {/* Inline Options Panel */}
      {isExpanded && (
        <View style={formStyles.dropdownPanel}>
          {searchable && (
            <TextInput
              style={formStyles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari..."
              placeholderTextColor="#475569"
              autoCapitalize="none"
            />
          )}
          {filteredOptions.length === 0 ? (
            <View style={formStyles.emptyList}>
              <Text style={formStyles.emptyListText}>Tidak ada pilihan cocok.</Text>
            </View>
          ) : (
            <ScrollView
              style={formStyles.dropdownScroll}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === selectedValue;
                return (
                  <TouchableOpacity
                    key={`${opt.value}-${idx}`}
                    style={[formStyles.listItem, isSelected && formStyles.listItemActive]}
                    onPress={() => handleSelect(opt.value)}
                  >
                    <Text style={[formStyles.listItemText, isSelected && formStyles.listItemTextActive]}>
                      {opt.label}
                    </Text>
                    {isSelected && <Text style={formStyles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const formStyles = StyleSheet.create({
  field: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    paddingRight: 10,
  },
  inputInside: {
    flex: 1,
    color: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    height: '100%',
  },
  inputDisabled: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  inputDisabledText: {
    color: '#64748B',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  eyeButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  selectButton: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectButtonText: {
    color: '#FFF',
    fontSize: 14,
  },
  selectPlaceholder: {
    color: '#475569',
  },
  selectArrow: {
    color: '#64748B',
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    color: '#64748B',
    fontSize: 12,
  },
  list: {
    padding: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
    backgroundColor: 'transparent',
  },
  listItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  listItemText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  listItemTextActive: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  checkmark: {
    color: '#3B82F6',
    fontWeight: '800',
    fontSize: 14,
  },
  emptyList: {
    padding: 24,
    alignItems: 'center',
  },
  emptyListText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  dropdownPanel: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 180,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 180,
    width: '100%',
  },
  searchInput: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    color: '#FFF',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
    margin: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: 10,
  },
  switchLabel: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

// ==========================================
// 3. FORM SWITCH
// ==========================================
interface FormSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function FormSwitch({ label, value, onValueChange }: FormSwitchProps) {
  return (
    <View style={formStyles.switchRow}>
      <Text style={formStyles.switchLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#334155', true: '#10B981' }}
        thumbColor={value ? '#FFF' : '#94A3B8'}
      />
    </View>
  );
}
