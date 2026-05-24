import React from 'react';
import { View } from 'react-native';
import { FormInput, FormSelect, FormSwitch } from '../AdminForm';
import { Jurusan } from '@/services/supabase';

interface KelasFormProps {
  tingkat: string;
  onChangeTingkat: (val: string) => void;
  nama: string;
  onChangeNama: (text: string) => void;
  jurusanId: string;
  onChangeJurusanId: (val: string) => void;
  jurusans: Jurusan[];
  isActive: boolean;
  onChangeIsActive: (val: boolean) => void;
  errors: Record<string, string>;
}

export function KelasForm({
  tingkat,
  onChangeTingkat,
  nama,
  onChangeNama,
  jurusanId,
  onChangeJurusanId,
  jurusans,
  isActive,
  onChangeIsActive,
  errors,
}: KelasFormProps) {
  return (
    <View style={{ gap: 6 }}>
      <FormSelect
        label="Tingkat Kelas"
        selectedValue={tingkat}
        onValueChange={onChangeTingkat}
        options={[
          { label: 'X (Sepuluh)', value: 'X' },
          { label: 'XI (Sebelas)', value: 'XI' },
          { label: 'XII (Dua Belas)', value: 'XII' },
        ]}
      />
      <FormInput
        label="Nama Kelas"
        value={nama}
        onChangeText={onChangeNama}
        placeholder="Contoh: XII RPL 1"
        error={errors.nama}
      />
      <FormSelect
        label="Jurusan Terkait"
        selectedValue={jurusanId}
        onValueChange={onChangeJurusanId}
        options={jurusans.map((j) => ({ label: j.nama_jurusan, value: j.id }))}
        placeholder="Pilih Jurusan..."
        error={errors.jurusan}
      />
      <FormSwitch
        label="Status Aktif"
        value={isActive}
        onValueChange={onChangeIsActive}
      />
    </View>
  );
}
