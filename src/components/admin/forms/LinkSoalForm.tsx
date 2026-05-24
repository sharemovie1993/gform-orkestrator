import React from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { FormInput, FormSelect, FormSwitch } from '../AdminForm';
import { Kelas, Mapel, Guru } from '@/services/supabase';

interface LinkSoalFormProps {
  kelasId: string;
  onChangeKelasId: (val: string) => void;
  kelas: Kelas[];
  mapelId: string;
  onChangeMapelId: (val: string) => void;
  mapels: Mapel[];
  guruId: string;
  onChangeGuruId: (val: string) => void;
  gurus: Guru[];
  tanggalUjian: string;
  onChangeTanggalUjian: (val: string) => void;
  waktuUjian: string;
  onChangeWaktuUjian: (val: string) => void;
  link: string;
  onChangeLink: (text: string) => void;
  isActive: boolean;
  onChangeIsActive: (val: boolean) => void;
  enableBlocking: boolean;
  onChangeEnableBlocking: (val: boolean) => void;
  errors: Record<string, string>;
  onOpenDateTimePicker: () => void;
  formatIndonesianDate: (dateStr: string) => string;
}

export function LinkSoalForm({
  kelasId,
  onChangeKelasId,
  kelas,
  mapelId,
  onChangeMapelId,
  mapels,
  guruId,
  onChangeGuruId,
  gurus,
  tanggalUjian,
  onChangeTanggalUjian,
  waktuUjian,
  onChangeWaktuUjian,
  link,
  onChangeLink,
  isActive,
  onChangeIsActive,
  enableBlocking,
  onChangeEnableBlocking,
  errors,
  onOpenDateTimePicker,
  formatIndonesianDate,
}: LinkSoalFormProps) {
  return (
    <View style={{ gap: 6 }}>
      <FormSelect
        label="Target Kelas"
        selectedValue={kelasId}
        onValueChange={onChangeKelasId}
        options={kelas.map((k) => ({ label: k.nama_kelas, value: k.id }))}
        placeholder="Pilih Kelas..."
        error={errors.kelas}
      />
      <FormSelect
        label="Mata Pelajaran"
        selectedValue={mapelId}
        onValueChange={onChangeMapelId}
        options={mapels.map((m) => ({ label: `${m.nama_mapel} (${m.singkatan})`, value: m.id }))}
        placeholder="Pilih Mapel..."
        error={errors.mapel}
      />
      <FormSelect
        label="Guru Pengampu"
        selectedValue={guruId}
        onValueChange={onChangeGuruId}
        options={gurus.map((g) => ({ label: g.nama_guru, value: g.id }))}
        placeholder="Pilih Guru..."
        error={errors.guru}
        searchable={true}
      />
      
      {/* Tanggal Ujian */}
      <Text style={styles.formLabel}>Tanggal Ujian</Text>
      {Platform.OS === 'web' ? (
        <div style={{ marginBottom: 8 }}>
          <input
            type="date"
            value={tanggalUjian}
            onChange={(e) => onChangeTanggalUjian(e.target.value)}
            style={{
              backgroundColor: '#0F172A',
              borderColor: errors.tanggal ? '#EF4444' : '#334155',
              borderWidth: '1.5px',
              borderStyle: 'solid',
              borderRadius: '10px',
              color: '#FFF',
              padding: '10px 14px',
              fontSize: '14px',
              width: '100%',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: 'pointer',
              colorScheme: 'dark',
            } as any}
          />
        </div>
      ) : (
        <TouchableOpacity
          style={[styles.pickerBtn, errors.tanggal ? styles.pickerBtnError : null]}
          onPress={onOpenDateTimePicker}
          activeOpacity={0.7}
        >
          <Text style={styles.pickerBtnText}>
            📅 {tanggalUjian ? formatIndonesianDate(tanggalUjian) : 'Pilih Tanggal'}
          </Text>
          <Text style={styles.pickerBtnArrow}>▼</Text>
        </TouchableOpacity>
      )}
      {errors.tanggal && <Text style={styles.errorText}>{errors.tanggal}</Text>}

      {/* Waktu Ujian */}
      <Text style={styles.formLabel}>Waktu Ujian</Text>
      {Platform.OS === 'web' ? (
        <div style={{ marginBottom: 8 }}>
          <input
            type="time"
            value={waktuUjian}
            onChange={(e) => onChangeWaktuUjian(e.target.value)}
            style={{
              backgroundColor: '#0F172A',
              borderColor: errors.waktu ? '#EF4444' : '#334155',
              borderWidth: '1.5px',
              borderStyle: 'solid',
              borderRadius: '10px',
              color: '#FFF',
              padding: '10px 14px',
              fontSize: '14px',
              width: '100%',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: 'pointer',
              colorScheme: 'dark',
            } as any}
          />
        </div>
      ) : (
        <TouchableOpacity
          style={[styles.pickerBtn, errors.waktu ? styles.pickerBtnError : null]}
          onPress={onOpenDateTimePicker}
          activeOpacity={0.7}
        >
          <Text style={styles.pickerBtnText}>
            🕒 {waktuUjian ? waktuUjian.substring(0, 5) : 'Pilih Waktu'}
          </Text>
          <Text style={styles.pickerBtnArrow}>▼</Text>
        </TouchableOpacity>
      )}
      {errors.waktu && <Text style={styles.errorText}>{errors.waktu}</Text>}

      <FormInput
        label="Link Google Form Ujian"
        value={link}
        onChangeText={onChangeLink}
        placeholder="Contoh: https://docs.google.com/forms/d/..."
        error={errors.link}
      />
      <FormSwitch
        label="Aktifkan Cheat Blocking (Kunci Layar)"
        value={enableBlocking}
        onValueChange={onChangeEnableBlocking}
      />
      <FormSwitch
        label="Status Aktif Ujian"
        value={isActive}
        onValueChange={onChangeIsActive}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  formLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  pickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 10,
  },
  pickerBtnError: {
    borderColor: '#EF4444',
  },
  pickerBtnText: {
    color: '#FFF',
    fontSize: 14,
  },
  pickerBtnArrow: {
    color: '#64748B',
    fontSize: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: -4,
    marginBottom: 10,
    fontWeight: '600',
  },
});
