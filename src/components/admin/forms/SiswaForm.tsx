import React from 'react';
import { View } from 'react-native';
import { FormInput, FormSelect, FormSwitch } from '../AdminForm';
import { Kelas } from '@/services/supabase';

interface SiswaFormProps {
  nisn: string;
  onChangeNisn: (text: string) => void;
  nama: string;
  onChangeNama: (text: string) => void;
  kelasId: string;
  onChangeKelasId: (val: string) => void;
  kelas: Kelas[];
  isActive: boolean;
  onChangeIsActive: (val: boolean) => void;
  errors: Record<string, string>;
}

export function SiswaForm({
  nisn,
  onChangeNisn,
  nama,
  onChangeNama,
  kelasId,
  onChangeKelasId,
  kelas,
  isActive,
  onChangeIsActive,
  errors,
}: SiswaFormProps) {
  return (
    <View style={{ gap: 6 }}>
      <FormInput
        label="NISN Siswa"
        value={nisn}
        onChangeText={onChangeNisn}
        placeholder="Masukkan 10 digit NISN"
        keyboardType="numeric"
        error={errors.nisn}
      />
      <FormInput
        label="Nama Lengkap Siswa"
        value={nama}
        onChangeText={onChangeNama}
        placeholder="Contoh: Budi Santoso"
        error={errors.nama}
      />
      <FormSelect
        label="Kelas"
        selectedValue={kelasId}
        onValueChange={onChangeKelasId}
        options={kelas.map((k) => ({ label: k.nama_kelas, value: k.id }))}
        placeholder="Pilih Kelas..."
        error={errors.kelas}
      />
      <FormSwitch
        label="Status Aktif"
        value={isActive}
        onValueChange={onChangeIsActive}
      />
    </View>
  );
}
