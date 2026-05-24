import React from 'react';
import { View } from 'react-native';
import { FormInput, FormSwitch } from '../AdminForm';

interface JurusanFormProps {
  nama: string;
  onChangeNama: (text: string) => void;
  isActive: boolean;
  onChangeIsActive: (val: boolean) => void;
  error?: string;
}

export function JurusanForm({
  nama,
  onChangeNama,
  isActive,
  onChangeIsActive,
  error,
}: JurusanFormProps) {
  return (
    <View style={{ gap: 6 }}>
      <FormInput
        label="Nama Jurusan"
        value={nama}
        onChangeText={onChangeNama}
        placeholder="Contoh: Rekayasa Perangkat Lunak (RPL)"
        error={error}
      />
      <FormSwitch
        label="Status Aktif"
        value={isActive}
        onValueChange={onChangeIsActive}
      />
    </View>
  );
}
