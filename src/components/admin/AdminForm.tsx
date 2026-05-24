import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

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
  const theme = useTheme();

  return (
    <View style={formStyles.field}>
      <Text style={[formStyles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[
        formStyles.inputContainer,
        { backgroundColor: theme.background, borderColor: theme.border },
        error ? { borderColor: theme.danger } : null,
        !editable && [formStyles.inputDisabled, { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected }],
      ]}>
        <TextInput
          style={[
            formStyles.inputInside,
            { color: theme.text },
            !editable && { color: theme.textMuted },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
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
      {error && <Text style={[formStyles.errorText, { color: theme.danger }]}>{error}</Text>}
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
  const theme = useTheme();

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
        <Text style={[formStyles.label, { color: theme.textSecondary }]}>{label}</Text>
        <div style={{ position: 'relative', width: '100%', pointerEvents: 'auto' }}>
          <select
            value={selectedValue || ''}
            onChange={(e) => onValueChange(e.target.value)}
            style={{
              backgroundColor: theme.background,
              borderColor: error ? theme.danger : theme.border,
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '10px',
              color: theme.text,
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
            <option value="" disabled style={{ backgroundColor: theme.backgroundElement, color: theme.textMuted }}>
              {placeholder}
            </option>
            {options.map((opt, idx) => (
              <option 
                key={`${opt.value}-${idx}`} 
                value={opt.value} 
                style={{ backgroundColor: theme.backgroundElement, color: theme.text }}
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
              color: theme.textMuted,
              fontSize: '10px',
              pointerEvents: 'none',
            }}
          >
            ▼
          </span>
        </div>
        {error && <Text style={[formStyles.errorText, { color: theme.danger }]}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={formStyles.field}>
      <Text style={[formStyles.label, { color: theme.textSecondary }]}>{label}</Text>
      
      <TouchableOpacity
        style={[formStyles.selectButton, { backgroundColor: theme.background, borderColor: theme.border }, error ? { borderColor: theme.danger } : null]}
        onPress={() => {
          setIsExpanded(!isExpanded);
          if (isExpanded) setSearchQuery('');
        }}
        activeOpacity={0.7}
      >
        <Text style={[formStyles.selectButtonText, { color: theme.text }, !selectedOption && { color: theme.textMuted }]}>
          {displayText}
        </Text>
        <Text style={[formStyles.selectArrow, { color: theme.textMuted }]}>{isExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {error && <Text style={[formStyles.errorText, { color: theme.danger }]}>{error}</Text>}

      {/* Inline Options Panel */}
      {isExpanded && (
        <View style={[formStyles.dropdownPanel, { backgroundColor: theme.background, borderColor: theme.border }]}>
          {searchable && (
            <TextInput
              style={[formStyles.searchInput, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari..."
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
            />
          )}
          {filteredOptions.length === 0 ? (
            <View style={formStyles.emptyList}>
              <Text style={[formStyles.emptyListText, { color: theme.textMuted }]}>Tidak ada pilihan cocok.</Text>
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
                    style={[formStyles.listItem, isSelected && [formStyles.listItemActive, { backgroundColor: theme.activeTheme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.08)' }]]}
                    onPress={() => handleSelect(opt.value)}
                  >
                    <Text style={[formStyles.listItemText, { color: theme.textSecondary }, isSelected && { color: theme.primary, fontWeight: '700' }]}>
                      {opt.label}
                    </Text>
                    {isSelected && <Text style={[formStyles.checkmark, { color: theme.primary }]}>✓</Text>}
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
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    paddingRight: 10,
  },
  inputInside: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    height: '100%',
  },
  inputDisabled: {},
  inputDisabledText: {},
  inputError: {},
  eyeButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  selectButton: {
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
    fontSize: 14,
  },
  selectPlaceholder: {},
  selectArrow: {
    fontSize: 10,
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
  listItemActive: {},
  listItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listItemTextActive: {},
  checkmark: {
    fontWeight: '800',
    fontSize: 14,
  },
  emptyList: {
    padding: 24,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dropdownPanel: {
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
    borderWidth: 1,
    borderRadius: 8,
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
    marginTop: 10,
  },
  switchLabel: {
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
  const theme = useTheme();
  return (
    <View style={[formStyles.switchRow, { borderTopColor: theme.border }]}>
      <Text style={[formStyles.switchLabel, { color: theme.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.success }}
        thumbColor={value ? '#FFF' : theme.textSecondary}
      />
    </View>
  );
}
