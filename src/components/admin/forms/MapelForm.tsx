import React from 'react';
import { View } from 'react-native';
import { FormInput, FormSwitch } from '../AdminForm';

interface MapelFormProps {
  nama: string;
  onChangeNama: (text: string) => void;
  singkatan: string;
  onChangeSingkatan: (text: string) => void;
  isActive: boolean;
  onChangeIsActive: (val: boolean) => void;
  errors: Record<string, string>;
}

export function MapelForm({
  nama,
  onChangeNama,
  singkatan,
  onChangeSingkatan,
  isActive,
  onChangeIsActive,
  errors,
}: MapelFormProps) {
  return (
    <View style={{ gap: 6 }}>
      <FormInput
        label="Nama Mata Pelajaran"
        value={nama}
        onChangeText={onChangeNama}
        placeholder="Contoh: Matematika"
        error={errors.nama}
      />
      <FormInput
        label="Singkatan Mapel"
        value={singkatan}
        onChangeText={onChangeSingkatan}
        placeholder="Contoh: MTK"
        error={errors.singkatan}
      />
      <FormSwitch
        label="Status Aktif"
        value={isActive}
        onValueChange={onChangeIsActive}
      />
    </View>
  );
}
